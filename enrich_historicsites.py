#!/usr/bin/env python3
"""
Enrich historicsites.geojson with state (and nearest city) using offline
point-in-polygon against the US states GeoJSON already used by the app.

Requirements: shapely  (pip install shapely)
Run from:     ~/Desktop/literary-roads/
Output:       historicsites_enriched.geojson
"""

import json
import sys
import urllib.request
from shapely.geometry import shape, Point

# ── State abbreviation map ────────────────────────────────────────────────────
STATE_ABBR = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
    'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
    'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
    'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
    'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
    'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
    'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
    'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
    'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
    'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
    'Wisconsin': 'WI', 'Wyoming': 'WY', 'District of Columbia': 'DC',
    'Puerto Rico': 'PR',
}

# ── Step 1: Load US states polygons ──────────────────────────────────────────
STATES_URL = 'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json'
STATES_LOCAL = '/tmp/us-states.json'

print('Loading US states GeoJSON...')
try:
    with open(STATES_LOCAL) as f:
        states_data = json.load(f)
    print('  (used cached copy)')
except FileNotFoundError:
    print(f'  Downloading from {STATES_URL}...')
    with urllib.request.urlopen(STATES_URL, timeout=30) as resp:
        raw = resp.read()
    states_data = json.loads(raw)
    with open(STATES_LOCAL, 'wb') as f:
        f.write(raw)
    print('  Downloaded and cached.')

state_polys = []
for feat in states_data['features']:
    name = feat['properties']['name']
    abbr = STATE_ABBR.get(name, name)
    try:
        poly = shape(feat['geometry']).buffer(0)  # buffer(0) fixes invalid geometries
        state_polys.append({'abbr': abbr, 'name': name, 'shape': poly,
                            'bounds': poly.bounds})  # (minx, miny, maxx, maxy)
    except Exception as e:
        print(f'  Warning: could not parse {name}: {e}')

print(f'  Loaded {len(state_polys)} state polygons.')

# ── Step 2: Fast point-in-state lookup ───────────────────────────────────────
# Pre-filter by bounding box before the expensive polygon test.
def point_to_state(lng, lat):
    p = Point(lng, lat)
    candidates = [s for s in state_polys
                  if s['bounds'][0] <= lng <= s['bounds'][2]
                  and s['bounds'][1] <= lat <= s['bounds'][3]]
    for s in candidates:
        if s['shape'].contains(p):
            return s['abbr']
    # Fallback: nearest centroid (catches border edge cases)
    if candidates:
        best = min(candidates, key=lambda s: s['shape'].centroid.distance(p))
        return best['abbr']
    return None

# ── Step 3: Load US cities for nearest-city lookup ───────────────────────────
# We use a bundled minimal dataset of ~30k US cities derived from the
# GeoNames database (public domain). Stored as a compact JSON array:
# [ [lat, lng, "City", "ST"], ... ]
CITIES_URL = 'https://raw.githubusercontent.com/lutangar/cities.json/master/cities.json'
CITIES_LOCAL = '/tmp/us-cities.json'

print('Loading US cities dataset...')
try:
    with open(CITIES_LOCAL) as f:
        cities_raw = json.load(f)
    print(f'  (used cached copy — {len(cities_raw):,} cities)')
except FileNotFoundError:
    print(f'  Downloading from {CITIES_URL}...')
    try:
        with urllib.request.urlopen(CITIES_URL, timeout=60) as resp:
            raw = resp.read()
        cities_raw = json.loads(raw)
        with open(CITIES_LOCAL, 'wb') as f:
            f.write(raw)
        print(f'  Downloaded {len(cities_raw):,} cities.')
    except Exception as e:
        print(f'  Could not download cities: {e}. City enrichment will be skipped.')
        cities_raw = []

# Build US-only city list: [{lat, lng, city, state}]
cities = []
for c in cities_raw:
    if isinstance(c, dict) and c.get('country') == 'US':
        try:
            cities.append({
                'lat': float(c['lat']),
                'lng': float(c['lng']),
                'city': c['name'],
                'state': c.get('admin1', ''),
            })
        except (KeyError, ValueError):
            pass

print(f'  {len(cities):,} US cities available for nearest-city lookup.')

# Build a simple lat/lng grid index for fast nearest-city lookup
# Group cities by 1-degree grid cell
if cities:
    city_grid = {}
    for c in cities:
        cell = (int(c['lat']), int(c['lng']))
        city_grid.setdefault(cell, []).append(c)

    def nearest_city(lng, lat):
        best = None
        best_dist = float('inf')
        # Check 2-degree radius of grid cells
        for dlat in range(-2, 3):
            for dlng in range(-2, 3):
                cell = (int(lat) + dlat, int(lng) + dlng)
                for c in city_grid.get(cell, []):
                    d = (c['lat'] - lat) ** 2 + (c['lng'] - lng) ** 2
                    if d < best_dist:
                        best_dist = d
                        best = c
        return best
else:
    def nearest_city(lng, lat):
        return None

# ── Step 4: Load and enrich historicsites.geojson ─────────────────────────────
INPUT  = 'historicsites.geojson'
OUTPUT = 'historicsites_enriched.geojson'

print(f'\nLoading {INPUT}...')
with open(INPUT) as f:
    data = json.load(f)

feats = data['features']
print(f'  {len(feats):,} features to process.')

state_added  = 0
city_added   = 0
already_had  = 0
outside_us   = 0

for i, feat in enumerate(feats):
    if i % 10000 == 0 and i > 0:
        print(f'  {i:,}/{len(feats):,}  state_added={state_added:,}  city_added={city_added:,}')

    props = feat.get('properties') or {}
    geo   = feat.get('geometry') or {}
    coords = geo.get('coordinates')
    if not coords:
        continue
    geo_type = geo.get('type', '')
    # Extract a representative point for non-Point geometries
    if geo_type == 'Point':
        if len(coords) < 2 or not isinstance(coords[0], (int, float)):
            continue
        lng, lat = coords[0], coords[1]
    elif geo_type in ('Polygon', 'MultiPolygon'):
        # Use the first ring's first vertex as a rough centroid stand-in
        try:
            ring = coords[0] if geo_type == 'Polygon' else coords[0][0]
            lngs = [p[0] for p in ring]
            lats = [p[1] for p in ring]
            lng, lat = sum(lngs)/len(lngs), sum(lats)/len(lats)
        except Exception:
            continue
    else:
        continue
    if not (-180 <= lng <= 180 and -90 <= lat <= 90):
        continue

    has_state = bool(props.get('addr:state', '').strip())
    has_city  = bool(props.get('addr:city', '').strip())

    if has_state and has_city:
        already_had += 1
        continue

    # State lookup
    if not has_state:
        st = point_to_state(lng, lat)
        if st:
            props['addr:state'] = st
            state_added += 1
        else:
            outside_us += 1

    # City lookup (nearest city within ~30 miles / ~0.5 degrees)
    if not has_city:
        nc = nearest_city(lng, lat)
        if nc and ((nc['lat'] - lat)**2 + (nc['lng'] - lng)**2) < 0.25:
            props['addr:city'] = nc['city']
            city_added += 1

print(f'\nDone:')
print(f'  State added : {state_added:,}')
print(f'  City added  : {city_added:,}')
print(f'  Already had : {already_had:,}')
print(f'  Outside US  : {outside_us:,}')

# ── Step 5: Coverage report ───────────────────────────────────────────────────
total   = len(feats)
w_state = sum(1 for f in feats if f.get('properties', {}).get('addr:state'))
w_city  = sum(1 for f in feats if f.get('properties', {}).get('addr:city'))
w_addr  = sum(1 for f in feats if f.get('properties', {}).get('addr:street')
                                 or f.get('properties', {}).get('addr:full'))
w_name  = sum(1 for f in feats if f.get('properties', {}).get('name'))

print(f'\nCoverage after enrichment:')
print(f'  name    : {w_name:,} / {total:,} ({w_name*100//total}%)')
print(f'  state   : {w_state:,} / {total:,} ({w_state*100//total}%)')
print(f'  city    : {w_city:,} / {total:,} ({w_city*100//total}%)')
print(f'  address : {w_addr:,} / {total:,} ({w_addr*100//total}%)')

# ── Step 6: Write output ──────────────────────────────────────────────────────
print(f'\nWriting {OUTPUT}...')
with open(OUTPUT, 'w') as f:
    json.dump(data, f)
print(f'Done! Upload {OUTPUT} via the admin panel (Historic Sites, GeoJSON mode).')
