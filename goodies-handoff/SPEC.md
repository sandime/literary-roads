# Handoff: DJ Cat's Goodies — Road Trip Checklist (printable PDF) + Goodies menu

Two deliverables, both in the **Highway Snacks** corner of Literary Roads:

1. **Road Trip Checklist** — a single-page, print-ready **PDF** (US Letter, 8.5×11,
   portrait). The first free printable. This is the priority build.
2. **DJ Cat's Goodies** — the in-app menu page that lists the printables. A simple,
   data-driven list/card layout; the checklist is row #1, with room for future rows.

Mockups (reference renders, not production):
- `mockup-checklist.png` — the printable, full page.
- `mockup-goodies.png` — the Goodies menu screen (night/neon app view).

Working HTML references (recreate in the target codebase / PDF pipeline; treat as a
precise visual spec, not code to ship verbatim):
- `Road Trip Checklist.html` — the printable. **Already print-ready** — it can be
  fed straight to the existing PDF skill/library (render at 816×1056 px = 8.5×11 in
  @ 96dpi, or set `@page { size: Letter; margin: 0 }`). Fonts via Google Fonts.
- `DJ Cats Goodies.html` — the menu page.
- `assets/` — `radio-cat.png` (DJ Cat), `star-cat-mark.png`, `thumb-checklist.png`
  (the checklist preview used in the menu row).

---

## Core idea — "Day mode" print, "Night mode" screen

Highway Snacks normally lives at night: midnight navy + neon glow. **Neon does not
print** (glow → muddy gray on a home inkjet), so the printable is the brand's
**Day mode**: cream paper, ink-black line art, the neon trio flattened to **spot
colors that also hold up in grayscale**. The Goodies *menu* stays in full night/neon
(it's an on-screen app view, not a print).

### B&W-safe rules the printable follows (keep these)
- **Structure never depends on color.** It's carried by ink-black rules, 2px borders,
  bold type, and two dark navy bands (header + footer) that reverse to white text.
- Accent colors are **print-darkened** so they survive desaturation, and only ever
  used for non-load-bearing flourishes (number-chip inner ring, section ticks,
  divider diamonds). Remove every accent and the page still reads perfectly.
- Checkboxes are open ink squares (2px border, 3px radius) on cream — clear whether
  printed in color, grayscale, or pure B&W.
- Ink economy: only **two** solid dark fills on the page (header + footer bands).
  Everything else is white/cream with line work.

---

## Color tokens

| Role | Print (checklist) | Screen (menu / brand) | Notes |
|---|---|---|---|
| Navy (bands, ink) | `#10162B` | `#10162B` | header/footer bands; reversed white text |
| Deeper navy | — | `#0A0F20` / `#1A2342` | menu gradient + raised card |
| Ink (borders/text/shadow) | `#11141F` | `#11141F` | 2px borders, hard offset shadows |
| Paper / cream | `#FBF3DF` (page), `#FDF7E6` (boxes) | `#FBF3DF` text | page background, checkboxes |
| Secondary text | `#6A6452` (muted) | `#E7D9B6` / `#8C93B5` | italic notes / captions |
| **Atomic Orange** | `#D26A1E` *(darkened)* | `#F5812A` | sections 01 & 03 accent |
| **Starlight Turquoise** | `#1E8C84` *(darkened)* | `#39E0D6` | sections 02 & 04 accent |
| Hot Pink (star) | — | `#F23D8E` | menu divider diamond, card spine option |
| Mustard | `#FFC94D` (header accents only) | `#F4C740` | menu title glow, primary button |

> The print column uses **darkened** orange/turquoise so a grayscale print keeps
> contrast. On screen, use the true neon values from the brand tokens.

---

## Typography (brand families, already loaded via Google Fonts)

| Family | Use |
|---|---|
| **DM Serif Display** | Page/headline titles ("DJ Cat's Road Trip Checklist", "DJ Cat's Goodies"), menu card titles |
| **IM Fell English SC** (small-caps) | Section names ("Before You Go"…), menu labels ("The Rack"), footer nameplate |
| **Fraunces** (italic) | Subheads, the parenthetical/"— …" item notes, taglines, the "word from the DJ" |
| **Space Grotesk** | Checklist item text, buttons |
| **JetBrains Mono** | Eyebrows, meta chips, the dial readout, URLs, section numbers |

---

## 1) Road Trip Checklist — layout spec

**Canvas:** 816 × 1056 px (8.5 × 11 in @ 96dpi), portrait. Full-bleed; a double ink
frame is inset **22px** (outer 2px line + inner 1px line at +4px). All content lives
inside the inner inset.

**Vertical order:**
1. **Header band** (navy, full width inside frame, ~108px tall):
   - DJ Cat (`radio-cat.png`) in a cream circle, **rendered grayscale** (`grayscale(1)
     contrast(1.18)`) so it prints as a vintage cut-out, 92px, cream ring + navy halo.
   - Eyebrow (mono, cream): `✦ LITERARY ROADS RADIO · HIGHWAY SNACKS`.
   - Title (DM Serif Display, ~30px, cream, **single line, `white-space:nowrap`**):
     "DJ Cat's Road Trip Checklist".
   - Subhead (Fraunces italic, cream): "Pack the car, pack the books. Tune in & roll out."
   - A faint Googie **sunburst** (repeating-conic-gradient, masked into a ring,
     ~16% opacity) bleeds off the right edge.
2. **Atomic divider** — a 2px ink rule flanked by small orange/turquoise diamonds.
3. **Two columns** (flex, 26px gap), 4 sections total. Each section:
   - **Header row:** a 26px **number chip** (navy fill, 2px ink border, accent
     `inset` ring, mono number) + section name (IM Fell SC, 18px) + a 2px ink rule
     filling the row + a small accent **diamond tick**.
   - **Items:** `<ul>` of rows. Each row = a 16px ink checkbox (3px radius, tiny hard
     shadow) + text. Main text Space Grotesk 12.5px/500; the "— …" or "(…)" **note**
     in Fraunces italic, muted `#6A6452`. Rows separated by 1px dotted hairlines
     (`#C7BB9E`), ~7.5px vertical padding.
   - **Column split (keeps numeric order reading top→bottom, left→right):**
     - **Left:** 01 Before You Go (11), 02 Your Literary Kit (7)
     - **Right:** 03 While You're Out There (6), 04 Glove Box Essentials (5), then a
       **"word from the DJ"** note card (cream, 2px ink border, 3px hard shadow) at
       the column bottom to balance the shorter stack — kicker + a short italic
       quote + an 88–108 radio-dial flourish. (Decorative balance, not new content.)
4. **Footer band** (navy, full width): `star-cat-mark.png` + Fraunces-italic
   "Print this, fold it, glove-box it. **— DJ Cat**" + mono `LITERARYROADS.RADIO / GOODIES`.

**Fold guides:** two faint dashed horizontal rules at thirds (y≈374, y≈706) labeled
"FOLD" in tiny mono — so it tri-folds into the glove box.

### Checklist content (verbatim — main text / *italic note*)

**01 · BEFORE YOU GO**
- Gas tank full
- Tire pressure checked
- Phone charger / car charger
- Umbrella
- Flashlight
- Jumper cables
- Snacks packed
- Water bottles
- Playlist queued *— or tune in to Literary Roads Radio*
- Route saved in Literary Roads
- Paper map backup *(just in case)*

**02 · YOUR LITERARY KIT**
- Current book *— the one you're actually reading*
- Next book *— in case you finish early*
- Bookmark *(don't lose your page to a gas station receipt)*
- A travel journal or notebook
- A pen that actually works
- Stark's Fortune for the road *(pulled before you leave)*
- Cash or card for indie bookstore stops *— you will find one*

**03 · WHILE YOU'RE OUT THERE**
- Stop at a literary landmark
- Visit an independent bookstore or coffee shop
- Sign a guestbook
- Write a Hitchhiker's Tale *(even a short one)*
- Take a Road Shot
- Talk to someone local about a book they love

**04 · GLOVE BOX ESSENTIALS**
- Sunglasses
- First aid basics
- Reusable bag *(for the books you'll inevitably buy)*
- Hand sanitizer / wipes
- Emergency contact card filled out

### PDF build notes
- Source HTML is already sized to the sheet. Render at 96dpi (816×1056) or with
  `@page { size: Letter; margin: 0 }`. There is **no `@media print`** divergence —
  what you see is what prints. Embed the five brand fonts (or let the PDF lib fetch
  Google Fonts).
- Keep it **one page**. If the renderer reflows, the only at-risk spot is the
  single-line title — keep `white-space:nowrap` and the 30px size.
- DJ Cat is intentionally grayscale; don't "fix" it to color.

---

## 2) DJ Cat's Goodies — menu page spec

Night/neon app view (the printable's opposite mode). Centered column, max-width
**760px**, on the brand radial-navy background
(`radial-gradient(120% 80% at 50% -10%, #1A2342, #10162B 46%, #0A0F20)`), with a
faint conic **sunburst watermark** (~5% opacity) fixed behind.

- **Header (centered):** mono eyebrow → **"DJ Cat's Goodies"** (DM Serif Display
  ~60px, mustard with a soft glow text-shadow; the apostrophe in cream) → tagline
  "Free printables for the road." (Fraunces italic) → a short rule with a pink
  diamond.
- **List head:** "The Rack" (IM Fell SC) on the left, a mono count on the right
  ("1 printable · more on the way").
- **Printable row (the data-driven unit):** a raised navy card (radius 16, 1px
  `#2A335A` border) with a glowing accent **left spine** (4px, orange), containing:
  - **Thumb** (96px, the printable's cover = `thumb-checklist.png`) in a cream,
    2px-ink, hard-shadow frame with a mono format tag ("8.5 × 11").
  - **Body:** mono kicker ("CHECKLIST") · DM Serif title · Fraunces description ·
    a row of mono **chips** (`New` highlighted in turquoise, then `PDF`, `1 page`,
    `Print-friendly B&W`).
  - **Actions:** primary pill **"Download PDF"** (mustard, ink border, hard shadow)
    + ghost pill **"Preview"**.
- **Empty/future slot:** a dashed-border row ("+ More goodies on the way. New
  printables drop right here.") — this is the **template for new rows**; render one
  per future printable instead of the placeholder.
- **Footer:** star-cat mark + "Highway Snacks · A Literary Roads roadside attraction".

### Data shape (drive the rows from this)
```
Printable = {
  id, kicker,            // e.g. "checklist"
  title,                 // "Road Trip Checklist"
  description,
  thumb,                 // cover image (portrait preview of the PDF)
  format: { label, pages, aspect },   // "PDF", 1, "8.5×11"
  flags: ['new', 'print-friendly'],
  accent,                // spine + kicker color; rotate orange/cyan/pink/mustard
  pdfUrl                 // → Download PDF
}
```
New printables = new `Printable` records; the row component and the dashed empty
state are already designed for an arbitrarily long rack.

---

## Assets
| File | Use |
|---|---|
| `assets/radio-cat.png` | DJ Cat. Checklist header (grayscale); brand mascot. |
| `assets/star-cat-mark.png` | Footer mark (both pages). |
| `assets/thumb-checklist.png` | Checklist cover preview for the menu row. |

No emoji as UI. Decoration is the atomic SVG/CSS vocabulary: sunbursts
(conic-gradient), diamonds (clip-path), sparks. Don't add icon sets.
