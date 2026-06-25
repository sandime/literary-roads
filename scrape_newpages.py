#!/usr/bin/env python3
"""
Scrape independent bookstores from NewPages.com and geocode them.

Scrapes all 63 state/province pages, parses bookstore entries, forward-geocodes
each one via Nominatim, deduplicates against the existing bookshops-enriched.geojson,
and writes new-only entries to newpages-bookstores.geojson.

Usage:
  python3 scrape_newpages.py                  # scrape + geocode + write output
  python3 scrape_newpages.py --scrape-only    # scrape without geocoding (for inspection)
  python3 scrape_newpages.py --us-only        # skip Canadian provinces
  python3 scrape_newpages.py --state CA       # single state for testing

Safe to interrupt and re-run — scrape cache and geocode cache are both persisted.

Output: newpages-bookstores.geojson (new stores not already in bookshops-enriched.geojson)
"""

import json, re, sys, time, urllib.request, html as html_mod, os, shutil
from urllib.error import URLError

# ── Config ────────────────────────────────────────────────────────────────────

BASE_URL          = 'https://www.newpages.com'
MAIN_PAGE         = f'{BASE_URL}/independent-bookstores/'
EXISTING_FILE     = 'bookshops-enriched.geojson'
OUTPUT_FILE       = 'newpages-bookstores.geojson'
SCRAPE_CACHE      = '/tmp/newpages_scrape_cache.json'
GEO_CACHE         = '/tmp/newpages_geo_cache.json'
NOMINATIM_URL     = 'https://nominatim.openstreetmap.org/search'
RATE_LIMIT        = 1.1  # seconds between Nominatim requests (their policy: max 1/sec)
UA                = 'literary-roads-bookstore-enrichment/1.0 (awstories@gmail.com)'

SCRAPE_ONLY = '--scrape-only' in sys.argv
US_ONLY     = '--us-only' in sys.argv

# Single-state filter: --state CA  or  --state "New York"
_state_arg = None
if '--state' in sys.argv:
    idx = sys.argv.index('--state')
    if idx + 1 < len(sys.argv):
        _state_arg = sys.argv[idx + 1].lower()

# ── State / province → abbreviation map ──────────────────────────────────────

STATE_ABBR = {
    'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
    'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
    'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
    'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
    'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
    'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
    'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
    'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
    'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
    'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
    'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
    'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'washington dc': 'DC',
    'washington d.c.': 'DC', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY',
    'u.s. territory': 'US-Territory', 'u s territory': 'US-Territory',
    # Canadian provinces
    'alberta': 'AB', 'british columbia': 'BC', 'manitoba': 'MB', 'new brunswick': 'NB',
    'newfoundland': 'NL', 'newfoundland and labrador': 'NL', 'newfoundland-labrador': 'NL',
    'northwest territories': 'NT', 'nova scotia': 'NS', 'ontario': 'ON',
    'prince edward island': 'PE', 'quebec': 'QC', 'saskatchewan': 'SK', 'yukon': 'YT',
}

CANADIAN_PROVINCES = {'AB', 'BC', 'MB', 'NB', 'NL', 'NT', 'NS', 'ON', 'PE', 'QC', 'SK', 'YT'}

# ── Cache helpers ─────────────────────────────────────────────────────────────

def load_cache(path):
    try:
        with open(path) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}

def save_cache(path, data):
    with open(path, 'w') as f:
        json.dump(data, f)

scrape_cache = load_cache(SCRAPE_CACHE)
geo_cache    = load_cache(GEO_CACHE)

# ── HTTP fetch ────────────────────────────────────────────────────────────────

def fetch(url, retries=3):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={
                'User-Agent': UA,
                'Accept-Language': 'en-US,en;q=0.9',
            })
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode('utf-8', errors='replace')
        except URLError as e:
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
            else:
                print(f'  [WARN] Failed to fetch {url}: {e}')
                return None

# ── HTML parsing ──────────────────────────────────────────────────────────────

def clean_html(s):
    """Strip tags and unescape HTML entities."""
    s = re.sub(r'<[^>]+>', '', s)
    return html_mod.unescape(s).strip()

def slug_to_state(slug):
    """Convert URL slug like 'california-independent-bookstores' → state name."""
    name = slug.replace('-independent-bookstores', '').replace('-', ' ').strip('/')
    # Handle trailing slashes in slug
    name = name.strip('/')
    return name

def parse_state_page(html_content, state_abbr):
    """Parse all bookstore entries from a state page."""
    bookstores = []

    # Each bookstore is a gb-grid-column div containing a <ul> with bookstore-* li items
    # Pattern: find all <ul> blocks that contain bookstore-title
    blocks = re.findall(
        r'(<ul>(?:(?!</ul>).)*?bookstore-title(?:(?!</ul>).)*?</ul>(?:\s*<p>.*?</p>)?)',
        html_content, re.DOTALL
    )

    for block in blocks:
        def get_field(cls):
            m = re.search(rf'class="bookstore-{cls}"[^>]*>(.*?)</li>', block, re.DOTALL)
            return clean_html(m.group(1)) if m else ''

        def get_link(cls):
            m = re.search(rf'class="bookstore-{cls}"[^>]*>.*?href="([^"]*)"', block, re.DOTALL)
            return m.group(1).strip() if m else ''

        # Name: strip "in CityName" suffix that NewPages appends
        raw_name = get_field('title')
        city_raw = get_field('city')
        # Remove "City: " prefix
        city_raw = re.sub(r'^City:\s*', '', city_raw)
        # Strip "in <City>" from name if present
        name = re.sub(r'\s+in\s+' + re.escape(city_raw) + r'\s*$', '', raw_name, flags=re.IGNORECASE).strip()
        if not name:
            name = raw_name

        website = get_link('website') or get_link('title')
        address = get_field('address')
        phone   = re.sub(r'^Phone:\s*', '', get_field('phone'))
        btype   = re.sub(r'^Type:\s*', '', get_field('type'))
        spec    = re.sub(r'^Specialty:\s*', '', get_field('specialty'))
        sides   = re.sub(r'^Sidelines:\s*', '', get_field('sidelines'))
        events  = re.sub(r'^Events:\s*', '', get_field('events'))
        fb      = get_link('fb')

        # Description: the <p> after the </ul>
        desc_m = re.search(r'</ul>\s*<p>(.*?)</p>', block, re.DOTALL)
        description = clean_html(desc_m.group(1)) if desc_m else ''

        if not name or not city_raw:
            continue

        bookstores.append({
            'name':        name,
            'website':     website,
            'address':     address,
            'city':        city_raw,
            'state':       state_abbr,
            'phone':       phone,
            'type':        btype,
            'specialty':   spec,
            'sidelines':   sides,
            'events':      events,
            'facebook':    fb,
            'description': description,
            'source':      'NewPages',
        })

    return bookstores

# ── Geocoding ─────────────────────────────────────────────────────────────────

_last_geo_request = 0.0

def geocode(name, address, city, state):
    """Forward geocode via Nominatim. Returns (lat, lng) or (None, None)."""
    global _last_geo_request

    # Build cache key
    cache_key = f'{address}|{city}|{state}'.lower()
    if cache_key in geo_cache:
        result = geo_cache[cache_key]
        return (result['lat'], result['lng']) if result else (None, None)

    # Rate limit
    elapsed = time.time() - _last_geo_request
    if elapsed < RATE_LIMIT:
        time.sleep(RATE_LIMIT - elapsed)

    # Try progressively looser queries
    queries = []
    if address:
        queries.append(f'{address}, {city}, {state}')
    queries.append(f'{name}, {city}, {state}')
    queries.append(f'{city}, {state}')

    for q in queries:
        params = urllib.parse.urlencode({'q': q, 'format': 'json', 'limit': '1'})
        url = f'{NOMINATIM_URL}?{params}'
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            _last_geo_request = time.time()
            with urllib.request.urlopen(req, timeout=15) as r:
                results = json.loads(r.read().decode())
            if results:
                lat = float(results[0]['lat'])
                lng = float(results[0]['lon'])
                geo_cache[cache_key] = {'lat': lat, 'lng': lng}
                save_cache(GEO_CACHE, geo_cache)
                return (lat, lng)
        except Exception as e:
            print(f'  [GEO WARN] {q}: {e}')
        finally:
            _last_geo_request = time.time()

    # Cache miss
    geo_cache[cache_key] = None
    save_cache(GEO_CACHE, geo_cache)
    return (None, None)

# Need urllib.parse for geocode()
import urllib.parse

# ── Deduplication ─────────────────────────────────────────────────────────────

def norm(s):
    """Normalize a string for fuzzy dedup: lowercase, strip punctuation/spaces."""
    return re.sub(r'[^a-z0-9]', '', s.lower()) if s else ''

def build_existing_index(path):
    """Return a set of (norm_name, norm_city) tuples from the existing GeoJSON."""
    try:
        with open(path) as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f'[WARN] {path} not found — skipping dedup')
        return set()

    index = set()
    for feat in data.get('features', []):
        p = feat.get('properties', {})
        name = p.get('name', '')
        city = p.get('addr:city', '') or p.get('addr:city', '')
        if name:
            index.add((norm(name), norm(city)))
    print(f'Loaded {len(index):,} existing entries for dedup.')
    return index

# ── GeoJSON builder ───────────────────────────────────────────────────────────

def make_feature(store, lat, lng):
    slug = re.sub(r'[^a-z0-9]+', '-', store['name'].lower()).strip('-')
    city_slug = re.sub(r'[^a-z0-9]+', '-', store['city'].lower()).strip('-')
    feat_id = f"newpages/{slug}-{city_slug}"

    props = {
        '@id':          feat_id,
        'name':         store['name'],
        'shop':         'books',
        'addr:city':    store['city'],
        'addr:state':   store['state'],
        'address':      store['address'],
        'source':       'NewPages',
    }
    if store['phone']:
        props['phone'] = store['phone']
    if store['website']:
        props['website'] = store['website']
    if store['facebook']:
        props['contact:facebook'] = store['facebook']
    if store['description']:
        props['description'] = store['description']
    if store['specialty']:
        props['specialty'] = store['specialty']
    if store['type']:
        props['bookType'] = store['type']
    if store['events']:
        props['events'] = store['events']

    return {
        'type': 'Feature',
        'properties': props,
        'geometry': {'type': 'Point', 'coordinates': [round(lng, 7), round(lat, 7)]},
        'id': feat_id,
    }

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print('=== NewPages Bookstore Scraper ===\n')

    # 1. Get all state page URLs from the main page
    print('Fetching main index page...')
    main_html = fetch(MAIN_PAGE)
    if not main_html:
        print('ERROR: Could not fetch main page.')
        sys.exit(1)

    state_urls = re.findall(r'href="(/independent-bookstores/[^"]+)"', main_html)
    state_urls = sorted(set(state_urls))
    print(f'Found {len(state_urls)} state/province pages.\n')

    # 2. Build existing-store index for dedup
    existing = build_existing_index(EXISTING_FILE)

    # 3. Scrape each state page
    all_stores = []
    for url_path in state_urls:
        # Derive state name and abbreviation from slug
        slug = url_path.strip('/')
        slug = slug.replace('independent-bookstores/', '')
        state_name = slug_to_state(slug)
        state_abbr = STATE_ABBR.get(state_name.lower(), state_name.upper()[:2])

        # Filters
        if US_ONLY and state_abbr in CANADIAN_PROVINCES:
            continue
        if _state_arg and _state_arg not in (state_name.lower(), state_abbr.lower()):
            continue

        full_url = f'{BASE_URL}{url_path}'

        # Use scrape cache
        if full_url in scrape_cache:
            raw = scrape_cache[full_url]
            stores = parse_state_page(raw, state_abbr)
            print(f'  [cached] {state_name} ({state_abbr}): {len(stores)} stores')
        else:
            print(f'  Scraping {state_name} ({state_abbr})... ', end='', flush=True)
            raw = fetch(full_url)
            time.sleep(0.5)  # polite delay between page fetches
            if not raw:
                print('FAILED')
                continue
            scrape_cache[full_url] = raw
            save_cache(SCRAPE_CACHE, scrape_cache)
            stores = parse_state_page(raw, state_abbr)
            print(f'{len(stores)} stores')

        all_stores.extend(stores)

    print(f'\nTotal scraped: {len(all_stores):,} stores across all pages.')

    if SCRAPE_ONLY:
        print('\n--scrape-only flag set. Skipping geocoding.')
        # Write raw scraped data as JSON for inspection
        with open('newpages-raw.json', 'w') as f:
            json.dump(all_stores, f, indent=2)
        print(f'Raw data written to newpages-raw.json')
        return

    # 4. Dedup + geocode
    print('\nGeocoding new stores (skipping duplicates)...')
    features = []
    skipped_dupe   = 0
    skipped_nogeo  = 0
    geocoded       = 0
    total          = len(all_stores)

    for i, store in enumerate(all_stores):
        key = (norm(store['name']), norm(store['city']))
        if key in existing:
            skipped_dupe += 1
            continue

        # Mark as seen so we don't re-add within this run either
        existing.add(key)

        lat, lng = geocode(store['name'], store['address'], store['city'], store['state'])

        if lat is None:
            skipped_nogeo += 1
            continue

        features.append(make_feature(store, lat, lng))
        geocoded += 1

        if geocoded % 50 == 0:
            # Save progress checkpoint
            _write_output(features)
            pct = round((i + 1) / total * 100)
            print(f'  [{pct}%] {geocoded} geocoded, {skipped_dupe} dupes, {skipped_nogeo} no-geo')

    # 5. Write final output
    _write_output(features)

    print(f'\n=== Done ===')
    print(f'  New stores geocoded:  {geocoded:,}')
    print(f'  Skipped (duplicates): {skipped_dupe:,}')
    print(f'  Skipped (no geo):     {skipped_nogeo:,}')
    print(f'  Output: {OUTPUT_FILE}')
    print(f'\nTo merge into bookshops-enriched.geojson, run:')
    print(f'  python3 merge_bookshops.py')

def _write_output(features):
    geojson = {'type': 'FeatureCollection', 'features': features}
    # Write to temp first, then rename (atomic)
    tmp = OUTPUT_FILE + '.tmp'
    with open(tmp, 'w') as f:
        json.dump(geojson, f)
    shutil.move(tmp, OUTPUT_FILE)

if __name__ == '__main__':
    main()
