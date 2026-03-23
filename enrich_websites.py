#!/usr/bin/env python3
"""
Enrich a GeoJSON file with website URLs from OSM fields.

Sources (in priority order):
  1. Direct URL fields: website, contact:website, url, contact:url, homepage
  2. Wikipedia tag  → https://{lang}.wikipedia.org/wiki/{article}
  3. Wikidata tag   → https://www.wikidata.org/wiki/{Q-id}

Wikipedia/Wikidata are valuable: many NRHP sites have these OSM tags even
without a dedicated website field. Coverage improvement depends on OSM tagging
density for your dataset — typical gain is 5-20% from Wikipedia alone.

Run from:  ~/Desktop/literary-roads/
Defaults:  reads/writes historicsites_enriched.geojson  (backward-compatible)

Usage:
  python3 enrich_websites.py                                  # historic sites
  python3 enrich_websites.py --input coffee-shops-enriched.geojson
"""

import json, shutil, sys

_args = sys.argv[1:]
def _flag(name):
    try: return _args[_args.index(name) + 1]
    except (ValueError, IndexError): return None

INPUT = _flag('--input') or 'historicsites_enriched.geojson'

# ── Website extraction ────────────────────────────────────────────────────────

DIRECT_FIELDS = ('website', 'contact:website', 'url', 'contact:url', 'homepage')

def extract_website(p):
    """Return (url, source) or (None, None)."""

    # 1. Direct URL fields
    for field in DIRECT_FIELDS:
        val = (p.get(field) or '').strip()
        if val:
            url = val if val.startswith('http') else 'https://' + val
            return url, 'direct'

    # 2. Wikipedia tag — format: "en:Article Title" or "Article Title"
    wiki = (p.get('wikipedia') or '').strip()
    if wiki:
        if ':' in wiki:
            lang, article = wiki.split(':', 1)
            url = f'https://{lang}.wikipedia.org/wiki/{article.replace(" ", "_")}'
        else:
            url = f'https://en.wikipedia.org/wiki/{wiki.replace(" ", "_")}'
        return url, 'wikipedia'

    # 3. Wikidata tag — format: "Q12345"
    wikidata = (p.get('wikidata') or '').strip()
    if wikidata and wikidata.startswith('Q'):
        return f'https://www.wikidata.org/wiki/{wikidata}', 'wikidata'

    return None, None


# ── Load GeoJSON ──────────────────────────────────────────────────────────────
print(f'Loading {INPUT}...')
with open(INPUT) as f:
    data = json.load(f)
feats = data['features']
total = len(feats)
print(f'  {total:,} features.')

# ── Enrich ────────────────────────────────────────────────────────────────────
already_had  = 0
by_source    = {'direct': 0, 'wikipedia': 0, 'wikidata': 0}
added        = 0

for feat in feats:
    p = feat.get('properties') or {}

    if p.get('website'):
        already_had += 1
        continue

    url, source = extract_website(p)
    if url:
        p['website']         = url
        feat['properties']   = p
        added               += 1
        by_source[source]   += 1

# ── Coverage report ───────────────────────────────────────────────────────────
w_web = sum(1 for f in feats if (f.get('properties') or {}).get('website'))

print(f'\nResults:')
print(f'  Already had website : {already_had:,}')
print(f'  Added (direct URL)  : {by_source["direct"]:,}')
print(f'  Added (Wikipedia)   : {by_source["wikipedia"]:,}')
print(f'  Added (Wikidata)    : {by_source["wikidata"]:,}')
print(f'\nCoverage after enrichment:')
print(f'  website : {w_web:,} / {total:,} ({w_web * 100 // total}%)')

# ── Save ──────────────────────────────────────────────────────────────────────
shutil.copy(INPUT, INPUT + '.bak')
print(f'\nWriting {INPUT}...')
with open(INPUT, 'w') as f:
    json.dump(data, f)
print(f'Done!  Upload {INPUT} via admin panel (delete existing collection first).')
