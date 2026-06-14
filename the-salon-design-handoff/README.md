# Handoff: The Salon

## Overview

**The Salon** is Literary Roads' book club — one book every two months, the whole
community reading it together. It is the app's most *considered* social space.

The Salon is **not a chatroom**. It is a **conversation about a book that resolves
into a verdict.** A member reads at their own pace and, once finished, posts:

1. an **atomic rating** (1–5, the mid-century atom is our star),
2. a **one-sentence verdict** (required, 140 chars), and
3. an optional **full response** (600 chars).

Those posts become a living, magazine-style review of the book. When the period
ends, the discussion **closes** and the community review is published to the Gazette.

This handoff covers **5 surfaces**:
1. Entry screen — the invitation
2. Review screen — atomic ratings + featured review cards + accordion + composer
3. Empty state — no reviews yet (the salon cat)
4. Profile card — three states (not enrolled / enrolled / closed)
5. Gazette announcement card

---

## About the Design Files

The files in `design/` are **design references in HTML/React-via-Babel** —
prototypes showing intended look and behavior, not production code to copy.
Recreate them in the target codebase using its component patterns, styling, and
state management. Treat the JSX as a precise visual + behavioral spec.

- `design/The Salon - Prototype.html` — the **responsive clickable prototype**
  (Entry → Review; rate, expand reviews, type in the composer). Resize the window:
  single-column on a phone, multi-column magazine on a wide screen.
- `design/The Salon - Full Scale.html` — 1:1 device views of all screens + cards.
- `design/The Salon.html` — annotated design-canvas of all 5 surfaces.
- `design/salon/salon-kit.jsx` — tokens (`S`), the `Atom`/`AtomRating`,
  `LevitatingBook`/`BookCover`, `Masthead`, buttons, status dot, rule, screen shell.
- `design/salon/salon-screens.jsx` — Entry, Review, Empty + sample review data.
- `design/salon/salon-cards.jsx` — `ProfileSalonCard` (3 states) + `GazetteSalonCard`.

---

## Fidelity

**High-fidelity.** Colors, typography, spacing, motion, and interaction behavior
are final. The one explicit placeholder is the **book cover** — `BookCover` draws
a golden-jacket stand-in; production must pass the real cover image (see Assets).

---

## Design Tokens

All values from `design/salon/salon-kit.jsx` (`S`).

### Color
| Token | Hex | Use |
|---|---|---|
| `teal`    | `#15484C` | **The background** — deep midnight teal |
| `teal2`   | `#0F373B` | Deeper recess — header/composer wash, behind cards |
| `teal3`   | `#1B585C` | Elevated surface / input field |
| `coral`   | `#f66483` | **The single action color** — CTA, book frame, primary accent, pull quote |
| `magenta` | `#c877bf` | Rotating featured-card color |
| `rust`    | `#a6480a` | Rotating featured-card color **and the filled atom** |
| `turq`    | `#30b8b2` | Turquoise — author line, links, progress, structure |
| `cream`   | `#FFF8E7` | Primary text |
| `atomOut` | `#3C8C8C` | Muted teal — the empty/outline atom |

Derived: `creamDim rgba(255,248,231,.66)`, `creamFaint .42`, `line .16`,
`lineTurq rgba(48,184,178,.28)`, `coralGlow rgba(246,100,131,.45)`.

### Typography — two families
| Family | Stack | Use |
|---|---|---|
| display / serif | `"Fraunces", Georgia, serif` | Book title (uppercase), review headlines, the editorial note, all body copy. A magazine voice. |
| sans | `"Space Grotesk", system-ui, sans-serif` | "THE SALON", dates, meta, button labels, counts — uppercase, letter-spaced. |

Representative sizes (px): entry book-title `clamp` 34–60 (driven by container width,
not `vw`); review headline 22; body 14.5; aggregate number 26–30; eyebrows/meta 9.5–11.
Letter-spacing `0.14–0.34em` on Space Grotesk labels; near-normal on Fraunces.

### Shape / motion
- Card radius **14px**; profile/Gazette **16px**; buttons **pill (999)**; inputs **12px**.
- Featured cards: solid rotating color, cream/teal text, soft shadow `0 10px 30px rgba(0,0,0,.22)`.
- Min touch target **48px** on buttons; 44px+ everywhere tappable.
- **Levitating book**: stroke-only coral/magenta frame, **5px** weight; book tilted **3.5°**,
  floating 4–6px over 3s (`salonFloat`), shadow scaling with it (`salonShadow`), soft coral glow
  behind (`salonGlow`). All gated on `prefers-reduced-motion: reduce`.
- **Frame sparkles**: two 4-point diamond starbursts sit on the frame's lengthwise (left/right)
  edges — a larger one (≈`0.17 × bookW`) on the **upper-left** edge and a smaller, intentionally
  unmatched one (≈`0.125 × bookW`) on the **lower-right** edge. They inherit `frameColor`, are
  centered on the stroke (`translate(±50%,±50%)`), and are sized to add sparkle without
  dominating the book. See `Sparkle` in `salon-kit.jsx` (concave 4-point SVG diamond).

### Background wash (screens)
```
radial-gradient(ellipse 70% 40% at 50% -5%,  rgba(246,100,131,.10), transparent 60%),
radial-gradient(ellipse 60% 50% at 95% 105%, rgba(48,184,178,.08),  transparent 55%)
over base #15484C
```

---

## The atom — our rating mark

A mid-century atom: a nucleus circle + three electron rings (ellipses at 0° / 60° / 120°).
- **Filled** = rust `#a6480a`; **empty** = muted teal `#3C8C8C`.
- Fractional fill is a left-clip, so `4.3` reads as four solid + one ~⅓ atom.
- On a **rust** featured card the rust atom is invisible, so the card overrides to a
  **cream** fill (`AtomRating fillColor`). On coral/magenta cards the rust atom reads fine.
- Sizes: ~15–17px in cards/accordion, 22px aggregate, **24px in the composer selector**.

---

## Core principles (do not violate)

1. **No emoji, anywhere.** Status is a colored dot; the rating is the atom; actions are words.
2. **The book always levitates inside its frame** — entry hero, Gazette card, masthead thumbnail.
3. **Coral means action.** One coral CTA per surface; the pull quote is the only other coral text.
4. **The cat appears on Entry and Empty only** — never on every screen.
5. **The review reads like a magazine** — solid color cards, big editorial headlines, masonry on desktop.
6. **Motion is gentle** — float, fade, accordion. No bounce, no spring. Respect reduced-motion.

---

## Screens / Views

### Shared: `SalonMastheadBar`
Sticky top bar, `rgba(15,55,59,.93)` + blur, bottom hairline. Row: back chevron `‹`
(coral) · 30×45 levitating-less book cover · column { "THE SALON" 9.5px coral; book
title 15px Fraunces uppercase + (wide) author turquoise italic } · (wide) dates +
status dot. `wide` is measured from the container, not the viewport.

### 1. Entry — the invitation (`SalonEntry`)
Masthead (THE SALON / **DEMON COPPERHEAD** / *Barbara Kingsolver* / MAY — JUNE 2026),
the levitating book in a coral frame, the salon cat, a 2–3 sentence italic editorial
note, "231 Literary Roadsters reading", coral **Are you in? →**, ghost **Maybe later**.
Wide → two columns (text left, book+cat right); narrow → masthead, then book+cat, then note + CTA.

### 2. Review — the magazine (`SalonReview`)
- **Aggregate rating** (`AggregateRating`): atoms + `4.3` + "Based on 47 reviews". Hidden until ≥ 20 reviews.
- **Pull quote** (`PullQuote`, optional / admin-controlled): large coral italic between two coral rules, "— Literary Roadster". Pass `null` to hide; the screen is designed to look right without it.
- **Featured cards** (`FeaturedCard` × 5): full-width single column on a phone, CSS-columns magazine masonry on desktop. Solid rotating **coral / magenta / rust**. Atom rating top-left, user · date top-right, one-sentence verdict as a big headline, optional full response below.
- **Accordion** (`AccordionRow`): the remaining reviews collapsed — atoms, italic one-line preview, user · date, chevron; expands to the full response.
- **Composer** (`Composer`, sticky bottom): atom selector (tap to rate, with a word label), one-sentence input (required, 140), optional full response (600, revealed by "+ Add a full response"), coral **Post →** (disabled until rating + sentence). Char counters turn coral near the cap.

### 3. Empty state (`SalonEmpty`)
Masthead bar, centered salon cat, "No reviews yet." + "The salon is open. Be the first to give your verdict.", composer pinned at the bottom.

### 4. Profile card — three states (`ProfileSalonCard`, prop `state`)
340-wide card, teal bg, turquoise hairline, radius 16.
- `join`: dates + "Next book: July 1"; footer "Are you in?" + coral **Yes →** / ghost **Maybe later**.
- `enrolled`: turquoise status dot "Reading"; turquoise progress bar + "28 days remaining"; turquoise-outline **Go to the Salon →**.
- `closed`: muted status dot "Closed"; "See what readers said."; coral-outline **Read the Gazette →**.

### 5. Gazette announcement card (`GazetteSalonCard`)
350-wide, **2px coral border**, coral glow. Atom eyebrow "THE SALON — NOW READING",
levitating cover in a magenta frame (motion off, sparkles inherit the magenta), title, author, dates, hairline,
"Join **231 Literary Roadsters**…", coral **Are you in? →**.

---

## Interactions & Behavior

- **Enter / Are you in**: transitions Entry → Review; profile card join → enrolled.
- **Rate**: tapping the composer atoms sets 1–5 (with a word label: Rough going … A masterpiece).
- **Post**: disabled until a rating *and* a one-sentence verdict exist; on post, prepend the
  new review to the featured column (the prototype rotates its color). 140 / 600 caps with live counters.
- **Accordion**: tapping a row expands/collapses its full response (smooth max-height).
- **Period close**: lock the composer (read-only), flip the dot to "Closed", surface the Gazette link.

## State Management
```
salonPeriod = { id, bookTitle, bookAuthor, coverURL, startDate, endDate,
                memberCount, status: 'open' | 'closed', gazetteReviewURL, nextBookDate }
aggregate   = { value, count, threshold: 20 }   // hide average until count >= threshold
pullQuote   = { text, by } | null               // admin-controlled, one per session
reviews[]   = { id, user, createdAt, rating, line, body, featured: bool, color }
draft       = { rating, line, full }            // the composer
```

## Assets
| Asset | Source | Notes |
|---|---|---|
| `assets/salon-cat.png` | Brand mascot (transparent PNG) | Entry + Empty only. |
| Book cover | **Publisher / Google Books** image | `BookCover`/`LevitatingBook` take `src` (set `COVER_SRC` in `salon-kit.jsx`, or `BOOK.cover`). Falls back to the golden-jacket placeholder when empty. Keep the tilt, drop shadow, coral glow, and stroke-only frame. |
| Fonts | Fraunces, Space Grotesk | Use the app's existing brand font setup. |

No emoji, no icon set — status is a dot, the rating is the atom, actions are words.

## Files
```
design/
  The Salon - Prototype.html     ← responsive clickable prototype (Entry → Review)
  The Salon - Full Scale.html    ← 1:1 device + card viewer (interactive)
  The Salon.html                 ← annotated design-canvas of all 5 surfaces
  salon/
    salon-kit.jsx                ← tokens (S), Atom/AtomRating, LevitatingBook, Masthead, buttons, shell
    salon-screens.jsx            ← Entry / Review / Empty + Composer + cards + sample data
    salon-cards.jsx              ← ProfileSalonCard (3 states) + GazetteSalonCard
  assets/salon-cat.png           ← mascot
  design-canvas.jsx, ios-frame.jsx  ← prototype scaffolding ONLY (do not port)
```
