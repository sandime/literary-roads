#!/usr/bin/env python3
"""
Merge all regional bookshop GeoJSON exports into one combined file,
then enrich with state (point-in-polygon) and nearest city.

- Reads every *.geojson from bookshops-geojson/
- Deduplicates by OSM @id so features near region borders aren't counted twice
- Fills addr:state via point-in-polygon against US states GeoJSON
- Fills addr:city via nearest-city lookup
- Prints a coverage report
- Writes bookshops.geojson

Requirements: shapely  (pip install shapely)
Run from:     ~/Desktop/literary-roads/
Usage:        python3 merge_bookshops.py
"""

import json, os, glob, urllib.request
from shapely.geometry import shape, Point

INPUT_DIR = 'bookshops-geojson'
OUTPUT    = 'bookshops.geojson'

# ── Step 1: Load US states polygons ──────────────────────────────────────────
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

STATES_URL   = 'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json'
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
        poly = shape(feat['geometry']).buffer(0)
        state_polys.append({'abbr': abbr, 'shape': poly, 'bounds': poly.bounds})
    except Exception as e:
        print(f'  Warning: could not parse {name}: {e}')

print(f'  Loaded {len(state_polys)} state polygons.')

def point_to_state(lng, lat):
    p = Point(lng, lat)
    candidates = [s for s in state_polys
                  if s['bounds'][0] <= lng <= s['bounds'][2]
                  and s['bounds'][1] <= lat <= s['bounds'][3]]
    for s in candidates:
        if s['shape'].contains(p):
            return s['abbr']
    if candidates:
        best = min(candidates, key=lambda s: s['shape'].centroid.distance(p))
        return best['abbr']
    return None

# ── Step 2: Load US cities for nearest-city lookup ───────────────────────────
CITIES_URL   = 'https://raw.githubusercontent.com/lutangar/cities.json/master/cities.json'
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

if cities:
    city_grid = {}
    for c in cities:
        cell = (int(c['lat']), int(c['lng']))
        city_grid.setdefault(cell, []).append(c)

    def nearest_city(lng, lat):
        best = None
        best_dist = float('inf')
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

# ── Step 3: Merge all regional GeoJSON files ──────────────────────────────────
files = sorted(glob.glob(os.path.join(INPUT_DIR, '*.geojson')))
if not files:
    print(f'ERROR: No .geojson files found in {INPUT_DIR}/')
    raise SystemExit(1)

print(f'\nFound {len(files)} regional files.')

all_features = []
seen_ids     = set()
dupe_skipped = 0

for path in files:
    with open(path) as f:
        data = json.load(f)
    feats = data.get('features', [])
    kept = 0
    for feat in feats:
        props  = feat.get('properties') or {}
        osm_id = props.get('@id') or feat.get('id') or ''
        if osm_id and osm_id in seen_ids:
            dupe_skipped += 1
            continue
        if osm_id:
            seen_ids.add(osm_id)
        all_features.append(feat)
        kept += 1
    print(f'  {os.path.basename(path)}: {kept} features kept')

print(f'\nMerge complete: {len(all_features):,} features ({dupe_skipped:,} duplicates skipped)')

# ── Step 4: Enrich with state and nearest city ────────────────────────────────
print('\nEnriching with state and city...')

state_added = 0
city_added  = 0
already_had = 0
outside_us  = 0

for i, feat in enumerate(all_features):
    if i % 5000 == 0 and i > 0:
        print(f'  {i:,}/{len(all_features):,}  state_added={state_added:,}  city_added={city_added:,}')

    props  = feat.get('properties') or {}
    geo    = feat.get('geometry') or {}
    coords = geo.get('coordinates')
    if not coords:
        continue

    geo_type = geo.get('type', '')
    if geo_type == 'Point':
        if len(coords) < 2 or not isinstance(coords[0], (int, float)):
            continue
        lng, lat = coords[0], coords[1]
    elif geo_type in ('Polygon', 'MultiPolygon'):
        try:
            ring = coords[0] if geo_type == 'Polygon' else coords[0][0]
            lngs = [p[0] for p in ring]
            lats = [p[1] for p in ring]
            lng, lat = sum(lngs) / len(lngs), sum(lats) / len(lats)
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

    if not has_state:
        st = point_to_state(lng, lat)
        if st:
            props['addr:state'] = st
            feat['properties'] = props
            state_added += 1
        else:
            outside_us += 1

    if not has_city:
        nc = nearest_city(lng, lat)
        if nc and ((nc['lat'] - lat) ** 2 + (nc['lng'] - lng) ** 2) < 0.25:
            props['addr:city'] = nc['city']
            feat['properties'] = props
            city_added += 1

print(f'\nEnrichment done:')
print(f'  State added : {state_added:,}')
print(f'  City added  : {city_added:,}')
print(f'  Already had : {already_had:,}')
print(f'  Outside US  : {outside_us:,}')

# ── Step 5: Coverage report ───────────────────────────────────────────────────
total   = len(all_features)
w_name  = sum(1 for f in all_features if (f.get('properties') or {}).get('name'))
w_state = sum(1 for f in all_features if (f.get('properties') or {}).get('addr:state'))
w_city  = sum(1 for f in all_features if (f.get('properties') or {}).get('addr:city'))
w_addr  = sum(1 for f in all_features if (
    (f.get('properties') or {}).get('addr:street') or
    (f.get('properties') or {}).get('addr:full') or
    (f.get('properties') or {}).get('address')
))
w_web   = sum(1 for f in all_features if (f.get('properties') or {}).get('website'))

def pct(n): return f'{n * 100 // total}%' if total else '-%'

print(f'\nCoverage after enrichment:')
print(f'  name    : {w_name:,} / {total:,} ({pct(w_name)})')
print(f'  state   : {w_state:,} / {total:,} ({pct(w_state)})')
print(f'  city    : {w_city:,} / {total:,} ({pct(w_city)})')
print(f'  address : {w_addr:,} / {total:,} ({pct(w_addr)})')
print(f'  website : {w_web:,} / {total:,} ({pct(w_web)})')

# ── Step 6: Write output ──────────────────────────────────────────────────────
output_data = {'type': 'FeatureCollection', 'features': all_features}
print(f'\nWriting {OUTPUT}...')
with open(OUTPUT, 'w') as f:
    json.dump(output_data, f)
print(f'Done!  Next steps:')
print(f'  python3 enrich_addresses.py --input bookshops.geojson --output bookshops-enriched.geojson')
print(f'  python3 enrich_addresses.py --input bookshops-enriched.geojson --output bookshops-enriched.geojson --geocode  # overnight')
print(f'  python3 enrich_websites.py --input bookshops-enriched.geojson')
print(f'  Then upload bookshops-enriched.geojson via the admin panel (bookStores collection).')
