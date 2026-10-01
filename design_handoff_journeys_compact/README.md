# Handoff: Journeys page — compact "Dusk strips" redesign (mobile + desktop)

> For the `sandime/literary-roads` repo. Supersedes the stamp-album landing + category view from `design_handoff_journeys_and_login` (Part 1, screens 1–2). Route detail (screen 3) is **unchanged**.

## ⚡ Paste-this prompt (Claude Code)

> Implement the compact Journeys redesign in `design_handoff_journeys_compact/`. Read this README fully. Rebuild the visual layer of `src/screens/JourneysPage.jsx` only: landing + category filter become one accordion screen on mobile and a rail + panel layout on desktop. Keep inline styles + the local `P` palette convention, existing fonts (Bungee, Special Elite, Georgia), existing Firestore reads (`curatedRoutes` where `active == true`), `filter` state, state-chip filtering, and navigation to `<RouteDetail>`. Remove the stamp-album / postage-badge / perforation UI and stop using `PosterIllustration` on this screen (keep the component — detail still uses it).

## About the design files

`design/Journeys Compact.dc.html` is an **HTML design reference**, not production code. Open it in a browser (keep `support.js` beside it) to see a canvas of every round. **Only these options are approved:**

- **Mobile:** option **2b** (dusk-ramp strips, UFO open) + wordmark **3b** (sunset fill). 2b in the file still shows the old teal "JOURNEYS" header — use the 3b header instead.
- **Desktop:** option **4a** (rail + panel).

Ignore rounds 1, 2a, 3a/3c/3d, and 4b; they're explorations. The file also loads the design-system bundle for poster art used by rejected options. The approved designs don't need it.

## Fidelity

**High-fidelity.** Reproduce colors, type, spacing, and copy exactly. Route data in the mock is sample data; bind to Firestore.

---

## Design tokens

Existing `P` palette (unchanged):

```js
const P = {
  bg: '#1C1A14', card: '#252318', orange: '#FF4E00', teal: '#40E0D0',
  gold: '#F5A623', cream: '#FFF8E7', muted: '#8a7d60', border: '#2a2820',
  navBg: '#141209',
};
```

**New: dusk ramp**. Strip backgrounds by **display index** (0–8), not by category:

```js
const DUSK = ['#1B1F2A','#2a2234','#3a2640','#4d2d4c','#5E3A5A','#744a6c','#8a5670','#a0605a','#B96A3E'];
```

If there are more than nine categories, interpolate or clamp to the last color. Ink `#1B1F2A`, plum-deep `#5E3A5A`, and terracotta `#B96A3E` come from the brand system. The in-between steps are interpolations.

**Wordmark gradient (3b):**

```css
background: linear-gradient(90deg, #a06a94 0%, #c0607a 40%, #e0704a 75%, #F58128 100%);
-webkit-background-clip: text; background-clip: text; color: transparent;
```

**Difficulty colors:** Easy `#40E0D0`, Moderate `#F5A623`, Remote `#FF4E00`.

**Fonts:** Bungee (display/labels), Special Elite (eyebrows/meta), Georgia (route names, book lines). Already loaded globally.

---

## Screen 1 — Mobile (< 900px): accordion

One screen replaces landing + category view. `filter` (existing state) = the open category key, or `null`.

### Nav bar (sticky, top: 0, z 5)
- Height 48, bg `P.navBg`, bottom border 1px `P.border`, padding 0 16, flex space-between.
- Left: `← MAP`, Bungee 10px, `P.teal`, letter-spacing .06em (existing back handler).
- Center: `LITERARY ROADS`, Bungee 12px, `P.teal`, .06em, `text-shadow: 0 0 8px rgba(64,224,208,.5)`.
- Right: 40px spacer.

### Header
- Padding 16 16 12. Flex row, `align-items: baseline`, space-between, gap 12.
- `JOURNEYS`: `<h1>`, Bungee **30px**, line-height 1, letter-spacing .04em, sunset gradient text (above). No glow.
- Right: `9 collections · 49 routes`, computed (category count · total active routes). Special Elite 10px, `P.muted`, .06em.

### Category strip (one per category, full width, no gap between strips)
- Height 60, background `DUSK[index]`, padding 0 16, flex space-between, align center, gap 12, cursor pointer. Tap toggles `filter` (tapping the open one closes it; only one open at a time).
- Left column (gap 3):
  - Subtitle (e.g. `High strange`): Special Elite 8px, `P.cream`, letter-spacing .2em, uppercase.
  - Label, uppercased (e.g. `UFO & PARANORMAL`): Bungee 14px, line-height 1, `P.cream`.
- Right (gap 10): `{n} routes`, Special Elite 10px, `P.cream`; then a 22×22 circle, 1px `P.cream` border, centered Bungee 11px glyph: `+` closed / `–` (en dash) open.

Category subtitles used in the mock (use Firestore/`TYPE_LABEL` data if a subtitle exists; otherwise these):
Route 66 — Centennial 2026 · Ghost Towns — Boom & bust · Lighthouses — Coastal beacons · UFO & Paranormal — High strange · National Parks — Public lands · Coffee Crawls — Third places · Bookstores — Indie shelves · Literary Landmarks — Where it happened · Author Country — Lived geographies.

### Expanded panel (directly under the open strip)
- bg `P.bg`, padding 12 0 6, **bottom border 2px `DUSK[index]`** (ties the panel to its strip).
- **State chips row:** flex, gap 6, `overflow-x: auto`, `scrollbar-width: none`, padding 0 16 6. Chips: padding 5 10, radius 14, Bungee 8px, .08em, uppercase, `flex: none`.
  - Active: bg `P.orange`, color `#fff`, no border.
  - Inactive: transparent, 1px `P.border`, color `P.muted`.
  - Items: `All states`, then `Multi-state` if any route spans >1 state, then distinct states in that category. This is the existing filter logic.
- **Route row** (repeat): grid `1fr auto`, gap 10, align center, padding 10 16, top border 1px `P.border`. Tap → existing route detail.
  - Name: Georgia 14px / 1.25, `P.cream`.
  - Meta: Special Elite 9px, `P.muted`, .06em. Format: `{state or "Multi-state"} · {duration} · {n} stops · {difficulty}`. Difficulty word colored by the difficulty color.
  - Book: Georgia 11px italic, `P.muted`, the first `readingList` title in curly quotes: `“The Roswell Incident”`.
  - Right: `›`, Bungee 12px, `P.teal`.
- Empty state (category has no routes for the chosen chip): Georgia 11px italic `P.muted`, e.g. *"Your road's clear here. Try another state."*

---

## Screen 2 — Desktop (≥ 900px): rail + panel (4a)

Mock frame is 1280×820. Page fills the viewport height and the columns scroll independently.

### Nav bar
- Height 56, bg `P.navBg`, bottom border 1px `P.border`, padding 0 48.
- `← MAP` Bungee 11px teal; `LITERARY ROADS` Bungee 14px teal + same glow; 60px right spacer.

### Body
- Flex column, padding 32 48 0, gap 24, `flex: 1; min-height: 0`.
- **Header row:** flex space-between, `align-items: flex-end`, gap 24.
  - Left column (gap 8): eyebrow `Plan your next adventure`, Special Elite 11px `P.muted` .2em uppercase; `JOURNEYS` Bungee **56px**, line-height .95, .04em, sunset gradient text.
  - Right: `9 collections · 49 routes`, Special Elite 12px `P.muted`, padding-bottom 6.
- **Columns:** grid `360px minmax(0,1fr)`, gap 32, `flex: 1; min-height: 0`.

### Left rail
- `overflow-y: auto`, hidden scrollbar, top corners radius 8.
- Strip: height 62, `DUSK[index]` bg, padding 0 18 0 20, same typography as mobile (subtitle 8px, label 14px, count 10px).
- Right glyph: `›` when unselected, `●` when selected (Bungee 11px cream, 12px wide centered).
- **Selected:** `box-shadow: inset 5px 0 0 #FFF8E7` (cream left bar).
- Click selects (no toggle-off; there is always a selection). Default is the featured category, or the first one.

### Right panel
- `overflow-y: auto`, flex column, gap 18, padding-bottom 32.
- **Panel header:** flex space-between, align flex-end, padding-bottom 16, **bottom border 2px `DUSK[selectedIndex]`**.
  - Eyebrow `The Collection · {subtitle}`: Special Elite 10px `P.gold` .25em uppercase.
  - Title `<h2>` (uppercased label): Bungee 32px, line-height 1, `P.cream`.
  - Right: `{n} routes`, Special Elite 12px `P.cream`.
- **Chips:** same as mobile but `flex-wrap: wrap`, gap 8, padding 6 12, Bungee 9px.
- **Route grid:** `repeat(2, minmax(0,1fr))`, gap 14.
  - Card: bg `P.card`, 1px `P.border`, radius 6, padding 18 20, flex column gap 8, cursor pointer.
  - Hover: border-color `#8a5670` + `translateY(-2px)`, 150ms `cubic-bezier(.2,.8,.2,1)`. No scale.
  - Eyebrow `{state} · {duration}`: Special Elite 9px `P.gold` .18em uppercase.
  - Name: Georgia 18px / 1.25 `P.cream`, `text-wrap: pretty`.
  - Meta `{n} stops · {difficulty}`: Special Elite 10px `P.muted`, difficulty colored.
  - Book line: Georgia 12px / 1.4 italic `P.muted`, top border 1px `P.border`, padding-top 8. Format: `“{title}” — {author}`.
  - Click → existing route detail. On desktop it's fine to keep the current full-page detail; opening it in the right panel is a possible follow-up.

---

## Interactions & state

- `filter` (existing): mobile = open accordion key or `null`; desktop = selected key (never null; default the first category).
- `stateFilter` (existing chip state): resets to `All states` when the category changes.
- Breakpoint: < 900px accordion, ≥ 900px rail + panel. Share data and handlers, and swap only the layout.
- Mobile: when a strip opens, keep its top in view (use `scrollTo` on the container, not `scrollIntoView`).
- Transitions: panel open/close can use a 240ms height/opacity fade with `cubic-bezier(.2,.8,.2,1)`. Optional; no bounce.
- Loading: render nine strips at the final heights with `DUSK` backgrounds and blank text while Firestore loads.

## Removed from the previous redesign
Stamp-album grid, tilted cards, perforated footer strip, circular `PostageBadge`, 200px category poster hero, dotted background texture, the orange "S" in JOURNEYS, and posters on this screen.

## Assets
None. No images; everything is CSS.

## Files
- `design/Journeys Compact.dc.html`: all rounds on one canvas. Approved: **2b**, **3b**, **4a**.
- `design/support.js`: runtime needed to open the HTML locally. Not for production.
- `screenshots/mobile-2b-accordion.png`: mobile accordion with UFO open. Its header is the old teal one; use the 3b header.
- `screenshots/mobile-3b-wordmark.png`: approved mobile header with the sunset wordmark.
- `screenshots/desktop-4a-rail-panel.png`: approved desktop layout.
