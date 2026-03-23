#!/usr/bin/env python3
"""
Enrich a GeoJSON file with street addresses.

Phase 1 (fast):   extracts addr:street, tiger:name_base, addr:full from existing OSM props.
Phase 2 (slow):   reverse-geocodes remaining features via Nominatim (~1 req/sec).
                  Run overnight — 35k features ≈ 10 hours. Results cached; safe to interrupt.

Run from:   ~/Desktop/literary-roads/
Defaults:   reads/writes historicsites_enriched.geojson  (backward-compatible)

Usage:
  python3 enrich_addresses.py                                          # historic sites, Phase 1
  python3 enrich_addresses.py --geocode                                # historic sites, Phase 1+2
  python3 enrich_addresses.py --input coffee-shops.geojson --output coffee-shops-enriched.geojson
  python3 enrich_addresses.py --input coffee-shops-enriched.geojson --output coffee-shops-enriched.geojson --geocode
"""

import json, sys, time, shutil, urllib.request

# ── Argument parsing ──────────────────────────────────────────────────────────
_args = sys.argv[1:]
def _flag(name):
    try: return _args[_args.index(name) + 1]
    except (ValueError, IndexError): return None

INPUT      = _flag('--input')  or 'historicsites_enriched.geojson'
OUTPUT     = _flag('--output') or INPUT
GEOCODE    = '--geocode' in _args
CACHE_FILE = '/tmp/nominatim_addr_cache.json'

# ── Load Nominatim cache ──────────────────────────────────────────────────────
try:
    with open(CACHE_FILE) as f:
        cache = json.load(f)
    print(f'Loaded {len(cache):,} cached Nominatim results.')
except FileNotFoundError:
    cache = {}

def _save_cache():
    with open(CACHE_FILE, 'w') as f:
        json.dump(cache, f)

# ── Address helpers ───────────────────────────────────────────────────────────

def extract_osm_address(p):
    """Extract street address from standard OSM / TIGER fields."""
    if p.get('addr:street'):
        num    = (p.get('addr:housenumber') or '').strip()
        street = p['addr:street'].strip()
        return f'{num} {street}'.strip()

    if p.get('tiger:name_base'):
        parts = [
            (p.get('tiger:name_direction_prefix') or '').strip(),
            (p.get('tiger:name_base')             or '').strip(),
            (p.get('tiger:name_type')             or '').strip(),
        ]
        addr = ' '.join(x for x in parts if x)
        if addr:
            return addr

    for field in ('addr:full', 'address', 'contact:address'):
        val = (p.get(field) or '').strip()
        if val:
            return val

    return None


def nominatim_address(lat, lng):
    """Reverse-geocode via Nominatim. Returns address string or '' (cached)."""
    key = f'{lat:.5f},{lng:.5f}'
    if key in cache:
        return cache[key]

    url = (
        f'https://nominatim.openstreetmap.org/reverse'
        f'?lat={lat}&lon={lng}&format=json&zoom=18'
    )
    req = urllib.request.Request(url, headers={
        'User-Agent': 'literary-roads-historic-sites-enrichment/1.0 (educational/non-commercial)'
    })
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
        a     = data.get('address', {})
        house = (a.get('house_number') or '').strip()
        road  = (
            a.get('road') or a.get('pedestrian') or
            a.get('footway') or a.get('path') or ''
        ).strip()
        result = f'{house} {road}'.strip() if house else road
    except Exception as e:
        print(f'  Nominatim error ({lat:.4f},{lng:.4f}): {e}')
        result = ''

    cache[key] = result
    _save_cache()
    return result


def representative_point(feat):
    """Return (lat, lng) for any geometry type, or None."""
    geo      = feat.get('geometry') or {}
    coords   = geo.get('coordinates')
    geo_type = geo.get('type', '')
    if not coords:
        return None
    try:
        if geo_type == 'Point':
            return coords[1], coords[0]
        if geo_type == 'Polygon':
            ring = coords[0]
        elif geo_type == 'MultiPolygon':
            ring = coords[0][0]
        else:
            return None
        lng = sum(pt[0] for pt in ring) / len(ring)
        lat = sum(pt[1] for pt in ring) / len(ring)
        return lat, lng
    except Exception:
        return None


# ── Load GeoJSON ──────────────────────────────────────────────────────────────
print(f'Loading {INPUT}...')
with open(INPUT) as f:
    data = json.load(f)
feats = data['features']
total = len(feats)
print(f'  {total:,} features.')

# ── Phase 1: OSM field extraction (fast) ─────────────────────────────────────
print('\nPhase 1: extracting addresses from OSM fields...')
already_had   = 0
osm_added     = 0
needs_geocode = []

for feat in feats:
    p = feat.get('properties') or {}
    if p.get('address'):
        already_had += 1
        continue
    addr = extract_osm_address(p)
    if addr:
        p['address'] = addr
        feat['properties'] = p
        osm_added += 1
    else:
        needs_geocode.append(feat)

print(f'  Already had address : {already_had:,}')
print(f'  Added from OSM      : {osm_added:,}')
print(f'  Still need geocoding: {len(needs_geocode):,}')

# ── Phase 2: Nominatim reverse geocoding (opt-in) ────────────────────────────
geo_added = 0

if GEOCODE:
    print(f'\nPhase 2: Nominatim reverse geocoding {len(needs_geocode):,} features...')
    print('Rate: 1 req/sec  |  Est. time: {:.0f} min  |  Safe to interrupt (cached)\n'.format(
        len(needs_geocode) / 60))

    for i, feat in enumerate(needs_geocode):
        if i % 1000 == 0 and i > 0:
            pct = (already_had + osm_added + geo_added) * 100 // total
            print(f'  {i:,}/{len(needs_geocode):,}  geocode_added={geo_added:,}  total_coverage={pct}%')

        pt = representative_point(feat)
        if not pt:
            continue
        lat, lng = pt

        addr = nominatim_address(lat, lng)
        if addr:
            feat['properties']['address'] = addr
            geo_added += 1

        time.sleep(1.0)   # Nominatim rate limit: 1 req/sec

else:
    print('\n(Phase 2 skipped — run with --geocode for Nominatim reverse geocoding.)')
    print('  Expected gain: +25-40% coverage  |  Est. runtime: ~10h for 35k features')

# ── Coverage report ───────────────────────────────────────────────────────────
w_addr = sum(1 for f in feats if (f.get('properties') or {}).get('address'))
print(f'\nCoverage after enrichment:')
print(f'  address : {w_addr:,} / {total:,} ({w_addr * 100 // total}%)')
if GEOCODE:
    print(f'  (OSM: +{osm_added:,}  Nominatim: +{geo_added:,})')

# ── Save ──────────────────────────────────────────────────────────────────────
shutil.copy(INPUT, INPUT + '.bak')
print(f'\nWriting {OUTPUT}...')
with open(OUTPUT, 'w') as f:
    json.dump(data, f)
next_cmd = f'python3 enrich_websites.py --input {OUTPUT}' if OUTPUT != 'historicsites_enriched.geojson' else 'python3 enrich_websites.py'
print(f'Done!  Next: {next_cmd}  then upload via admin panel.')
