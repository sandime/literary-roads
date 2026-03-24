#!/usr/bin/env python3
"""
Merge all per-state restaurant GeoJSON exports, filter chains/fast food,
and enrich with structured attributes ready for Firestore upload.

- Reads every *.geojson from RESTAURANTS-GEOJSON/
- Excludes amenity=fast_food and known chains
- Deduplicates by OSM @id
- Extracts: name, lat/lng, amenity, street_address, city, state, zipcode,
            website, phone, cuisine, dietary booleans, wheelchair_accessible,
            outdoor_seating, hours
- Optionally geocodes missing cities via Nominatim (--geocode, ~1 req/sec)
- Prints coverage report
- Writes restaurants.geojson

Run from:  ~/Desktop/literary-roads/
Usage:     python3 merge_restaurants.py
           python3 merge_restaurants.py --geocode   # fill missing cities overnight
"""

import json, os, re, glob, sys, time, urllib.request, urllib.parse

INPUT_DIR  = 'RESTAURANTS-GEOJSON'
OUTPUT     = 'restaurants.geojson'
GEOCODE    = '--geocode' in sys.argv
CACHE_FILE = '/tmp/nominatim_restaurant_cache.json'

# ── Chain / fast-food exclusion list ─────────────────────────────────────────
EXCLUDED_CHAINS = {
    # Fast food
    "mcdonald's", "burger king", "wendy's", "subway", "kfc", "taco bell",
    "chipotle", "panera", "panera bread", "five guys", "shake shack",
    "chick-fil-a", "popeyes", "arby's", "jimmy john's", "jersey mike's",
    "jersey mike's subs",
    # Coffee chains
    "starbucks", "dunkin'", "dunkin' donuts", "dunkin", "peet's coffee",
    "peet's",
    # Casual dining chains
    "applebee's", "chili's", "olive garden", "red lobster", "tgi friday's",
    "tgi fridays", "buffalo wild wings", "hooters", "denny's", "ihop",
    # Pizza chains
    "domino's", "papa john's", "pizza hut", "little caesars",
    # Other chains
    "sweetgreen", "cava", "honeygrow", "&pizza",
}

def is_excluded(props):
    if props.get('amenity') == 'fast_food':
        return True
    name = (props.get('name') or '').strip().lower()
    return name in EXCLUDED_CHAINS

# ── State code from filename ──────────────────────────────────────────────────
# Filenames: NC-restaurants.geojson, dc-restaurants.geojson, NM.restaurants.geojson
def state_from_filename(path):
    base = os.path.splitext(os.path.basename(path))[0]      # e.g. "NC-restaurants"
    part = re.split(r'[-.]', base)[0].upper()                # e.g. "NC"
    return part if 2 <= len(part) <= 3 else None

# ── Boolean helper ────────────────────────────────────────────────────────────
def to_bool(val):
    return str(val).strip().lower() == 'yes' if val is not None else False

# ── Nominatim geocoder (city lookup) ─────────────────────────────────────────
try:
    with open(CACHE_FILE) as f:
        geo_cache = json.load(f)
except FileNotFoundError:
    geo_cache = {}

geocode_calls = 0

def geocode_city(lng, lat):
    global geocode_calls
    key = f'{lat:.5f},{lng:.5f}'
    if key in geo_cache:
        return geo_cache[key]
    time.sleep(1.1)   # Nominatim rate limit: 1 req/sec
    geocode_calls += 1
    url = (f'https://nominatim.openstreetmap.org/reverse?format=json'
           f'&lat={lat}&lon={lng}&zoom=10&addressdetails=1')
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'literary-roads-enrichment/1.0'})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
        addr = data.get('address', {})
        city = (addr.get('city') or addr.get('town') or addr.get('village')
                or addr.get('county') or '')
        geo_cache[key] = city
        with open(CACHE_FILE, 'w') as f:
            json.dump(geo_cache, f)
        return city
    except Exception as e:
        print(f'  Geocode error at {lat},{lng}: {e}')
        geo_cache[key] = ''
        return ''

# ── Merge and enrich ──────────────────────────────────────────────────────────
files = sorted(glob.glob(os.path.join(INPUT_DIR, '*.geojson')))
if not files:
    print(f'ERROR: No .geojson files found in {INPUT_DIR}/')
    raise SystemExit(1)

print(f'Found {len(files)} state files.')

enriched_features = []
seen_ids          = set()
excluded_ff       = 0
excluded_chain    = 0
dupe_skipped      = 0
geocoded          = 0

for path in files:
    state_code = state_from_filename(path)
    with open(path) as f:
        data = json.load(f)

    for feat in data.get('features', []):
        props  = feat.get('properties') or {}
        osm_id = props.get('@id') or feat.get('id') or ''

        # Deduplicate
        if osm_id and osm_id in seen_ids:
            dupe_skipped += 1
            continue
        if osm_id:
            seen_ids.add(osm_id)

        # Exclude fast food
        if props.get('amenity') == 'fast_food':
            excluded_ff += 1
            continue

        # Exclude chains
        name_lc = (props.get('name') or '').strip().lower()
        if name_lc in EXCLUDED_CHAINS:
            excluded_chain += 1
            continue

        # Must have a name
        name = (props.get('name') or '').strip()
        if not name:
            continue

        # Coordinates
        geo    = feat.get('geometry') or {}
        coords = geo.get('coordinates')
        if not coords or geo.get('type') != 'Point':
            continue
        lng, lat = coords[0], coords[1]
        if not (-180 <= lng <= 180 and -90 <= lat <= 90):
            continue

        # Address
        house  = (props.get('addr:housenumber') or '').strip()
        street = (props.get('addr:street') or '').strip()
        street_address = f'{house} {street}'.strip() if house or street else ''

        city    = (props.get('addr:city') or '').strip()
        state   = (props.get('addr:state') or state_code or '').strip()
        zipcode = (props.get('addr:postcode') or '').strip()

        # Geocode missing city if requested
        if not city and GEOCODE:
            city = geocode_city(lng, lat)
            if city:
                geocoded += 1

        # Contact
        website = (props.get('website') or props.get('contact:website') or '').strip()
        phone   = (props.get('phone') or props.get('contact:phone') or '').strip()

        # Cuisine
        cuisine = (props.get('cuisine') or '').strip().lower() or None

        # Dietary booleans
        vegan        = to_bool(props.get('diet:vegan'))
        vegetarian   = to_bool(props.get('diet:vegetarian'))
        gluten_free  = to_bool(props.get('diet:gluten_free'))
        halal        = to_bool(props.get('diet:halal'))
        kosher       = to_bool(props.get('diet:kosher'))

        # Accessibility
        wheelchair_accessible = to_bool(props.get('wheelchair')) if props.get('wheelchair') == 'yes' else False

        # Additional
        outdoor_seating = to_bool(props.get('outdoor_seating'))
        hours = (props.get('opening_hours') or '').strip() or None

        new_props = {
            'name':                 name,
            'amenity':              props.get('amenity', 'restaurant'),
            'lat':                  lat,
            'lng':                  lng,
            'street_address':       street_address or None,
            'city':                 city or None,
            'state':                state or None,
            'zipcode':              zipcode or None,
            'website':              website or None,
            'phone':                phone or None,
            'cuisine':              cuisine,
            'vegan':                vegan,
            'vegetarian':           vegetarian,
            'gluten_free':          gluten_free,
            'halal':                halal,
            'kosher':               kosher,
            'wheelchair_accessible': wheelchair_accessible,
            'outdoor_seating':      outdoor_seating,
            'hours':                hours,
            # Preserve OSM id for dedup / future updates
            '@id':                  osm_id,
        }

        enriched_features.append({
            'type': 'Feature',
            'properties': new_props,
            'geometry': {'type': 'Point', 'coordinates': [lng, lat]},
        })

total = len(enriched_features)
print(f'\nDone:')
print(f'  Features kept      : {total:,}')
print(f'  Fast food excluded : {excluded_ff:,}')
print(f'  Chains excluded    : {excluded_chain:,}')
print(f'  Duplicates skipped : {dupe_skipped:,}')
if GEOCODE:
    print(f'  Cities geocoded    : {geocoded:,}')

# ── Coverage report ───────────────────────────────────────────────────────────
def cov(field):
    n = sum(1 for f in enriched_features if f['properties'].get(field))
    return f'{n:,} / {total:,} ({n * 100 // total}%)' if total else '-'

print(f'\nCoverage:')
print(f'  name                 : {cov("name")}')
print(f'  state                : {cov("state")}')
print(f'  city                 : {cov("city")}')
print(f'  street_address       : {cov("street_address")}')
print(f'  zipcode              : {cov("zipcode")}')
print(f'  website              : {cov("website")}')
print(f'  phone                : {cov("phone")}')
print(f'  cuisine              : {cov("cuisine")}')
print(f'  hours                : {cov("hours")}')
print(f'  vegan=true           : {sum(1 for f in enriched_features if f["properties"].get("vegan")):,}')
print(f'  vegetarian=true      : {sum(1 for f in enriched_features if f["properties"].get("vegetarian")):,}')
print(f'  halal=true           : {sum(1 for f in enriched_features if f["properties"].get("halal")):,}')
print(f'  kosher=true          : {sum(1 for f in enriched_features if f["properties"].get("kosher")):,}')
print(f'  wheelchair_accessible: {sum(1 for f in enriched_features if f["properties"].get("wheelchair_accessible")):,}')
print(f'  outdoor_seating=true : {sum(1 for f in enriched_features if f["properties"].get("outdoor_seating")):,}')

# ── Write output ──────────────────────────────────────────────────────────────
output_data = {'type': 'FeatureCollection', 'features': enriched_features}
print(f'\nWriting {OUTPUT}...')
with open(OUTPUT, 'w') as f:
    json.dump(output_data, f)
print(f'Done!')
print(f'  To fill missing cities: python3 merge_restaurants.py --geocode')
print(f'  Then upload {OUTPUT} via the admin panel (restaurants collection).')
