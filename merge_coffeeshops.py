#!/usr/bin/env python3
"""
Merge all per-state coffee shop GeoJSON exports into one combined file.

- Reads every *.geojson from coffeeshops-state-geojson/
- Fills addr:state from the filename for any feature that lacks it
- Deduplicates by OSM @id so features near state borders aren't counted twice
- Prints a coverage report
- Writes coffee-shops.geojson

Run from: ~/Desktop/literary-roads/
Usage:    python3 merge_coffeeshops.py
"""

import json, os, re, glob

INPUT_DIR = 'coffeeshops-state-geojson'
OUTPUT    = 'coffee-shops.geojson'

# Map the cleaned filename stem to a 2-letter state/territory code
FILENAME_TO_STATE = {
    'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
    'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
    'dc': 'DC', 'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
    'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
    'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
    'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
    'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
    'newhampshire': 'NH', 'newjersey': 'NJ', 'newmexico': 'NM', 'newyork': 'NY',
    'northcarolina': 'NC', 'northdakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
    'oregon': 'OR', 'pennsylvania': 'PA', 'rhodeisland': 'RI', 'southcarolina': 'SC',
    'southdakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
    'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'westvirginia': 'WV',
    'wisconsin': 'WI', 'wyoming': 'WY', 'puertorico': 'PR',
}

def state_from_filename(path):
    """Derive a 2-letter state code from the geojson filename."""
    base = os.path.splitext(os.path.basename(path))[0]   # e.g. "California-export"
    # Strip trailing -export, .export, -coffee (case-insensitive)
    base = re.sub(r'[-.]?(export|coffee)$', '', base, flags=re.IGNORECASE)
    # Collapse to lowercase letters only
    key = re.sub(r'[^a-z]', '', base.lower())             # e.g. "california", "dc"
    return FILENAME_TO_STATE.get(key)


# ── Merge ─────────────────────────────────────────────────────────────────────
files = sorted(glob.glob(os.path.join(INPUT_DIR, '*.geojson')))
if not files:
    print(f'ERROR: No .geojson files found in {INPUT_DIR}/')
    raise SystemExit(1)

print(f'Found {len(files)} state files.')

all_features = []
seen_ids     = set()
state_filled = 0
dupe_skipped = 0
no_state     = []

for path in files:
    state_code = state_from_filename(path)
    with open(path) as f:
        data = json.load(f)

    feats = data.get('features', [])
    for feat in feats:
        props = feat.get('properties') or {}
        osm_id = props.get('@id') or feat.get('id') or ''

        # Deduplicate (border-area cafes can appear in two state exports)
        if osm_id and osm_id in seen_ids:
            dupe_skipped += 1
            continue
        if osm_id:
            seen_ids.add(osm_id)

        # Fill addr:state from filename if missing
        if not props.get('addr:state') and state_code:
            props['addr:state'] = state_code
            feat['properties'] = props
            state_filled += 1
        elif not props.get('addr:state') and not state_code:
            no_state.append(os.path.basename(path))

        all_features.append(feat)

total = len(all_features)
print(f'\nMerge complete:')
print(f'  Features merged  : {total:,}')
print(f'  Duplicates skipped: {dupe_skipped:,}')
print(f'  addr:state filled : {state_filled:,}  (from filename)')
if no_state:
    print(f'  WARNING — could not determine state for {len(no_state)} features in: {set(no_state)}')

# ── Coverage report ───────────────────────────────────────────────────────────
w_name  = sum(1 for f in all_features if (f.get('properties') or {}).get('name'))
w_state = sum(1 for f in all_features if (f.get('properties') or {}).get('addr:state'))
w_city  = sum(1 for f in all_features if (f.get('properties') or {}).get('addr:city'))
w_addr  = sum(1 for f in all_features if (
    (f.get('properties') or {}).get('addr:street') or
    (f.get('properties') or {}).get('addr:full')   or
    (f.get('properties') or {}).get('address')
))
w_web   = sum(1 for f in all_features if (f.get('properties') or {}).get('website'))

def pct(n): return f'{n * 100 // total}%' if total else '-%'

print(f'\nCoverage before enrichment:')
print(f'  name    : {w_name:,} / {total:,} ({pct(w_name)})')
print(f'  state   : {w_state:,} / {total:,} ({pct(w_state)})')
print(f'  city    : {w_city:,} / {total:,} ({pct(w_city)})')
print(f'  address : {w_addr:,} / {total:,} ({pct(w_addr)})')
print(f'  website : {w_web:,} / {total:,} ({pct(w_web)})')

# ── Write output ──────────────────────────────────────────────────────────────
output_data = {
    'type': 'FeatureCollection',
    'features': all_features,
}
print(f'\nWriting {OUTPUT}...')
with open(OUTPUT, 'w') as f:
    json.dump(output_data, f)
print(f'Done!  Next steps:')
print(f'  python3 enrich_addresses.py --input coffee-shops.geojson --output coffee-shops-enriched.geojson')
print(f'  python3 enrich_addresses.py --input coffee-shops-enriched.geojson --output coffee-shops-enriched.geojson --geocode  # overnight')
print(f'  python3 enrich_websites.py --input coffee-shops-enriched.geojson')
print(f'  Then upload coffee-shops-enriched.geojson via admin panel (coffeeShops collection).')
