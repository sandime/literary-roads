# Handoff: The Trading Post

A redesign of the Literary Roads in-app store. Three core screens — **Shop**, **Product detail**, **Checkout** — backed by a small pattern library of wooden signs, luggage tags, postcards, and mileage-marker price plates.

---

## About the design files

The files in `design_files/` are **design references**, not production code. They are React + Babel JSX prototypes that render inside an iOS device frame on a design-canvas page so we could explore options side-by-side.

**Your job is to recreate these designs in the Literary Roads codebase** using its existing framework, components, routing, and state management — not to lift the JSX verbatim. If the project doesn't have a frontend yet, pick the framework that best fits the rest of the stack (React + Vite + Stripe Elements is a sensible default for this kind of store).

The prototype is a Single Page composition; in production these are three real routes (e.g. `/store`, `/store/:productSlug`, `/store/checkout`).

---

## Fidelity

**High-fidelity.** Colors, type, spacing, borders, shadows, and interaction states are all final. Reproduce pixel-for-pixel against the Literary Roads design system (see `design_files/colors_and_type.css`). Where this handoff and the design system disagree, the design system wins — the prototype always pulls from the same tokens.

---

## Brand context

This is a **paper-mode** surface (not the app's neon night-mode). Warm cream paper, ink-navy outlines, terracotta + mustard + forest-green accents pulled from the brand's vintage cat illustrations. The store should feel like stepping into a one-person general store — wood, paper, twine, ink. **No glassmorphism. No gradients (except the highway sign and Stripe button). No emoji.**

The store's proprietor is **Mr. Ollie** — a black cat in horn-rimmed glasses + a Literary Roads trucker cap, painted on a wooden chair. He's the brand's mascot for this surface. Image: `design_files/trading_post/assets/cat-store.png`.

Products are real, fulfilled via:
- **Stripe** for payments (Apple Pay, Link, card — Stripe Checkout or Payment Element)
- **Printful** for production + shipping (Kansas City fulfillment)

---

## Screens

### 1. Shop (`/store`)

The default store page — hero with Mr. Ollie, then three horizontally-scrolling "display case" shelves of products. A sticky bottom bar surfaces the cart whenever it has items.

**Layout** (390px iOS frame width, but should scale fluidly on web):
1. Top bar: `← Back` · centered eyebrow (`✦ EST. 2026 ✦`) · **satchel cart button** (right). Padding `6px 14px 10px`.
2. **Hero card** — cream paper card with red-striped awning, store-cat illustration on the right, `OPEN` sign hung in top-right corner of the card, wooden floor-plank strip at the bottom. Margin `6px 14px 14px`. Border `1.5px solid #1B1F2A`, radius `4px`, `box-shadow: 3px 3px 0 #1B1F2A` (the sticker shadow used throughout).
   - Eyebrow: "PROPRIETOR · MR. OLLIE" — IM Fell English SC, 10px, 0.2em letter-spacing, color `#45495A`.
   - Title: "The Trading Post" — DM Serif Display italic, 32px, line-height 0.92, color `#1B1F2A`. Wrapped on three lines.
   - Tagline: Fraunces italic, 11px, color `#45495A`, max-width 130px: *"Bookmarks, journals & stickers for the long road."*
   - Two info stamps under tagline: mustard "OPEN DAILY" (tilted −4°) and teal "FREE SHIPPING · $35+" (tilted 3°).
3. **Notice strip** — dashed border, mono caption. `0 14px`. Copy: *"NOTICE · orders ship monday + thursday — printed & mailed from kansas city"*.
4. **Three display cases**, in this order:
   - **Bookmarks** (luggage-tag cards)
   - **Journals** (postcard cards)
   - **Stickers** (postcard cards)
5. **Proprietor's note** — cream card with terracotta stamp tab at top-left ("A NOTE FROM THE SHOP"), italic Fraunces 13px copy, IM Fell English SC signature.
   - Copy: *"Everything in the case is drawn by yours truly, then mailed in a real envelope by my one and only employee. Take your time at the shelves." — MR. OLLIE, PROPRIETOR*
6. **Receipt footer** — cream perforated-ticket-style strip with shop name + payment/fulfillment partners.
7. **Sticky "to the till" bar** — appears only when `cartCount > 0`, sticks to `bottom: 10px`, full-width minus 14px gutters. Black bar with mustard count badge + mustard CTA chip.

#### Display case anatomy
Each case is one section:
- **Wooden sign header** centered above the shelf (component below). Tilt alternates `-1.5°`, `+1.2°`, `-1.4°`.
- A horizontally-scrolling row of cards (`overflow-x: auto`, hidden scrollbar). Cards have a tiny tilt (±0.6° to ±1.8°) so they feel hand-placed. Bottom of the row sits on a `14px` wood-plank rail.
- An end-of-row dashed "See all →" placeholder card (110px wide, IM Fell English SC 10px).
- Behind the cards: a faint horizontal wallpaper-stripe gradient on the cream paper.

#### Product card content (Shop screen)

| Bookmarks | Sub-line | Price | Accent color |
|---|---|---|---|
| Mister Ollie | leather · braided tassel | $9 | `#B96A3E` (terracotta) |
| The Star Cat | card stock · mustard | $6 | `#C99820` (mustard deep) |
| Neon Roadcat | foil · indigo | $12 | `#3B4E9E` |
| Open Book | card stock · plum | $6 | `#8E5A86` (plum) |

| Journals | Price | Accent | Stamp # |
|---|---|---|---|
| The Mile Marker Journal | $28 | `#2F5A3E` (forest) | A1 |
| Bookworm Field Notes | $18 | `#B96A3E` | B2 |
| Author Country Logbook | $24 | `#8E5A86` | C3 |

| Stickers | Price | Accent | Stamp # |
|---|---|---|---|
| Star Cat Decal Pack | $4 | `#C99820` | 1¢ |
| Literary Roads Crest | $5 | `#34B7AE` | 2¢ |
| Open Road · Open Book | $4 | `#B5483A` | 3¢ |
| Pogo-stick Postmark | $3 | `#8E5A86` | 4¢ |

These are placeholders pending real SKU names and Printful mockups.

### 2. Product detail (`/store/:slug`)

Single-product page, modeled on the Neon Roadcat bookmark.

1. Same top bar; eyebrow reads `✦ BOOKMARKS · NO. 003 ✦`.
2. **Hero card** — cream paper card with a nail at top-center and twine forking down to the luggage tag. The luggage tag is large (220×310), indigo card stock with a foil-bookmark mock inside (cyan/pink/orange neon elements). Brass grommet at top. Tilted `-2°`. Green "✦ IN STOCK" stamp top-right.
3. **Title block** — series eyebrow, italic title (DM Serif Display 30px), Fraunces 14px description.
4. **Pricing row** — cream card with the **mileage marker** on the left at scale 1.0 ($12 / ONE BOOKMARK), price details + bundle pricing on the right (e.g. "Pack of three → $30"), Printful ship-time mono line.
5. **Card stock chooser** — four `ColorChip` swatches: Indigo (foil) (selected), Terracotta, Forest, Natural. Selected chip translates `(-1px, -1px)` and gains the 2px sticker shadow.
6. **Quantity + Add row** — `QtyStepper` (− 01 +) followed by full-width black "Add to satchel — $12" sticker button.
7. **Spec ticker** — dashed-border block listing MADE / SIZE / TASSEL / PAYS / SHIPS in JetBrains Mono 10px.
8. **Pairs well with** — small horizontal row of two related products (scaled-down postcards).

### 3. Checkout (`/store/checkout`)

The shopping-cart-and-pay page styled as an old-fashioned receipt rolling out of a wooden till.

1. Same top bar; eyebrow reads `✦ THE TILL ✦`.
2. **Till stub** — 10px tall wood-grain bar at the top with a serrated paper edge below it.
3. **Receipt body** — cream paper card extending from the stub, with the sticker shadow.
   - Centered IM Fell English SC header `THE TRADING POST`.
   - Order ID + date in JetBrains Mono mono.
   - Italic Fraunces quote.
   - **Line items** — qty (mono) · name (Fraunces 600) + sub (mono small) · price (mono). One dotted divider between items.
   - **Subtotals** — SUBTOTAL / SHIPPING / TAX rows (IM Fell English SC labels, mono values).
   - **Total row** — between two 2px ink rules; "Total" in DM Serif Display italic 22px on the left, **mileage marker** ($45 in current sample) on the right tilted −3°.
   - **Ship-to card** — cream paper, dashed border. Address in Fraunces 13px, teal "PRINTFUL · KC FULFILLMENT" stamp + arrival window.
   - **Pay-with card** — cream paper, dashed border. Stripe color block (`#635BFF`) + card last-4 + small "or use Apple Pay · Link · card" line. "change" link uses postRed-underlined Space Grotesk.
   - **Pay button** — full-width 52px tall, Stripe purple gradient (`#7A6BFF → #635BFF`), `1.5px solid #1B1F2A`, sticker shadow, Space Grotesk 600 15px: `Pay $XX.XX · STRIPE CHECKOUT →`.
   - **Fine print** — Fraunces italic 11px center-aligned reassurance copy.
   - "READY" stamp watermark in postRed at 18% opacity, rotated -12°, bottom-right.
4. **Bottom serration** — matches the top serrated edge for symmetric ticket feel.

Current sample receipt items (3 line items): Neon Roadcat ×1 $12, Mile Marker Journal ×2 $28, Star-Cat Decal Pack ×1 $4 → subtotal $72.00, ship $4.50, tax (MO, 6.9%) $4.97, **total $81.47**. In production, all values are computed from the cart + Stripe + tax service.

---

## Interactions & behavior

### Cart (Shop screen)
Cart state is keyed by product `id`, value is integer qty:
```
cart: { 'bm-neon': 1, 'jr-mile': 2 }
```

| Trigger | Behavior |
|---|---|
| Tap card body | Navigate to product detail. |
| Tap "+ ADD" chip on a card | `cart[id] = (cart[id] || 0) + 1`. Chip morphs into `− N +` stepper. Satchel-count badge pops (240ms cubic-bezier `.34,1.56,.64,1` transform: rotate −10°→−6°). Sticky till-bar slides in if it wasn't visible. |
| Tap `+` on stepper | Increment + repeat satchel pop. |
| Tap `−` on stepper | Decrement. When qty drops to 0, stepper morphs back to "+ ADD". |
| Tap satchel icon | Navigate to checkout. |
| Tap sticky till bar | Navigate to checkout. |

### Product detail
- Color chip selection updates a local state; selected chip gets `transform: translate(-1px,-1px); box-shadow: 2px 2px 0 #1B1F2A`.
- QtyStepper updates a local qty (1–99). The "Add to satchel — $XX" button reflects the live total (`qty × unit price`).
- Tapping Add to satchel: dispatches `addToCart({ id, qty, variant })`, shows the same toast/satchel-pop the shop uses, navigates back to /store (or wherever the user came from). Confirm with PM.

### Checkout
- Ship-to and Pay-with cards each have a `change` button → opens Stripe Element for that field, or a separate address form.
- Pay button → submits to Stripe (`POST /api/checkout/session` then redirect, or `confirmPayment` with Payment Element). On success → `/store/order/:id` (not designed yet).
- All amounts re-compute live as cart changes.

### Animation
Reuse the Literary Roads animation tokens from the design system:
- Hover/press on sticker-shadow buttons: button translates `(3px, 3px)`, shadow disappears (`transition: 120ms ease`).
- Press: `(2px, 2px)`, immediate.
- Cart-count pop: `transform 240ms cubic-bezier(.34,1.56,.64,1)`.
- Sticky till bar enter: 240ms slide-up + fade. The shop should reserve `76px` of bottom padding while the bar is visible to keep the footer accessible.

### Empty states
- **Empty cart:** sticky till-bar is hidden, satchel badge is hidden.
- **Empty checkout:** redirect to /store with a small inline note (*"Your satchel's empty — head back to the shelves."*).
- **Out of stock:** swap the "IN STOCK" stamp for `postRed` "BACKORDER · 3 WK" stamp, disable the Add button (paper background, 40% opacity, no shadow), add a small "Tell me when it's back →" link.

### Accessibility
- All cat illustrations need real alt text (the cat-store image alt says *"Mister Ollie in his Trading Post chair"*).
- Stickers like "OPEN", stamp chips, and the mileage marker carry meaningful copy — make sure they're actual text, not images.
- The satchel button has `aria-label="Satchel — N items"`.
- Qty steppers need `aria-label="Increase quantity"` / `"Decrease quantity"` and the qty value should be in an element with `role="status"` and `aria-live="polite"` so screen readers announce changes.
- The horizontal display cases need keyboard scrollability — make sure `tabindex="0"` and arrow-key handlers are wired so a keyboard user can sweep through products.
- Maintain WCAG AA contrast: paper-on-paper text (`#45495A` on `#FFF8E6` ≈ 8.5:1, ✓). The mustard count badge on black bar uses dark ink text on mustard — ✓.

---

## State management

Minimum store needed (use the codebase's existing solution — Redux, Zustand, Pinia, etc.):

```ts
type LineItem = {
  productId: string;
  variantId: string;        // e.g. 'indigo-foil'
  qty: number;
  unitPrice: number;        // in cents
}

type CartState = {
  items: LineItem[];
  addItem(productId, variantId, qty?): void;
  setQty(productId, variantId, qty): void;
  removeItem(productId, variantId): void;
  subtotal: number;
  // computed
  count: number;
}
```

Server-side:
- `GET /api/products` — paginated list, grouped by category (`bookmark | journal | sticker`). Includes Printful variant IDs.
- `GET /api/products/:slug` — single product with variants, stock, related products.
- `POST /api/checkout/session` — create Stripe Checkout session (or Payment Intent) from cart payload. Server validates pricing.
- `POST /api/orders/:id/fulfill` — webhook from Stripe → kicks off Printful order creation. Out of scope here.

---

## Design tokens

All tokens are defined in `design_files/colors_and_type.css` (the project-wide brand stylesheet). The store uses this subset:

### Colors
| Token | Value | Used for |
|---|---|---|
| `--ink` | `#1B1F2A` | Body text, outlines, primary CTAs |
| `--paper` | `#F5EBD6` | Default page background |
| `--paper-2` | `#EADFC4` | Toasted paper, wallpaper stripes |
| `--paper-3` | `#FFF8E6` | Card surfaces, highlight cream |
| `--ink-soft` (=`#45495A`) | `#45495A` | Secondary text |
| `--ink-mute` (=`#6F7388`) | `#6F7388` | Tertiary text, captions |
| Wood 1 / 2 / 3 / 4 | `#C57A4C` / `#A85B2E` / `#7E4424` / `#4A2410` | Wooden signs, plank rails, satchel |
| `--terracotta` | `#B96A3E` | Bookmark accents, proprietor stamp |
| `--mustard` | `#F2C744` | Cart count, OPEN-DAILY stamp |
| `--mustard-deep` | `#C99820` | Sticker accent, bookmark |
| `--teal` | `#34B7AE` | Free-shipping stamp, sticker accent |
| `--plum` | `#8E5A86` | Bookmark + sticker accent |
| `signGreen` | `#2F5A3E` | Highway-sign + OPEN sign |
| `signGreenDk` | `#1F3F2A` | Highway-sign border ring |
| `postRed` | `#B5483A` | Stamp red, postage stamp |
| `twine` | `#8A6A3A` | Twine/string elements |
| Stripe primary | `#635BFF` / `#7A6BFF` | Pay-with chip + Stripe pay button |

### Type
- **Display** — DM Serif Display, italic, 22 / 26 / 30 / 32 px
- **Headings** — Fraunces 600, 13–15px
- **Eyebrow + stamps** — IM Fell English SC, 9–11px, letter-spacing 0.16–0.22em, uppercase
- **UI / buttons** — Space Grotesk 500–600, 11–15px
- **Mono (mileage, qty, mono details)** — JetBrains Mono 9–13px

### Spacing
4px base scale. Card padding generally `14px`; row gutter `14px`; outside gutter on the screen `14px`. Display cases use `18px` gap between cards.

### Shadows
- `box-shadow: 3px 3px 0 #1B1F2A` — sticker shadow on hero card, product card, receipt
- `box-shadow: 2px 2px 0 #1B1F2A` — sticker shadow on chips, stamps, color chips
- `box-shadow: 3px 3px 0 #7E4424, 0 14px 28px rgba(27,31,42,0.25)` — sticky till bar (wood-shadow + deep lift)
- `inset 0 0 0 1.5px rgba(74,36,16,0.85)` — wooden plank ink outline (use combined with the linear-gradient wood texture, see `WoodenSign` component)

### Borders
Standard ink border throughout: `1.5px solid #1B1F2A`. Dashed = product info regions, inner luggage-tag panels, sticker preview rings.

### Radii
`4px` cards · `2px` previews · `999px` only on circles (grommet, satchel buckle, postage cancellations) · `50%` chip dots & sticker ring.

---

## Pattern library — components to build

Build these in your component library (`components/store/` or equivalent). Each is implemented in `design_files/trading_post/components.jsx`:

| Component | Purpose | Key props |
|---|---|---|
| `WoodenSign` | Section header. Burnt edges, wood grain, two nails, optional rope hanger. | `children` (label), `sub`, `rope`, `tilt` |
| `MileageMarker` | Green-highway price plate. White double border, "EXIT" eyebrow, mono caption. | `price`, `label`, `scale`, `tilt` |
| `DiamondMarker` | Yellow-diamond accent marker (Free Ship $35+). | `text`, `scale`, `tilt` |
| `LuggageTag` | Bookmark product card. Notched top, brass grommet, twine, mileage-marker corner overlay. | `title`, `subtitle`, `price`, `accent`, `kind`, `tilt`, `scale` |
| `Postcard` | Journal + sticker product card. Half art / half "postcard back" with postage stamp + cancellation curves. | `title`, `kind`, `price`, `accent`, `stamp`, `stampColor`, `tilt`, `scale` |
| `Stamp` | Small stamp chip (OPEN DAILY, IN STOCK, etc). | `children`, `color`, `ink`, `tilt` |
| `SatchelButton` | Top-right cart icon — canvas bag, brass buckle, mustard count badge. | `count`, `pulse`, `onTap` |
| `AddToSatchelChip` | Hand-tied price-tag stub. Idle "+ ADD" → expanded `− N +` stepper. | `qty`, `onAdd`, `onInc`, `onDec` |
| `QtyStepper` | Larger stepper used on product detail. `01 / 02 / …` mono display, ± sticker buttons. | `qty`, `onInc`, `onDec` |
| `ColorChip` | Variant swatch with sticker-shadow selected state. | `color`, `label`, `on`, `onTap` |
| `ShopHeader` | Top bar: back · centered eyebrow · satchel. | `sub`, `cartCount`, `cartPulse`, `onBack`, `onCart` |
| `PaperTexture` | Subtle multi-radial dot grain. Renders as absolute-positioned overlay. | `opacity` |
| `Squiggle` | Hand-drawn wavy line accent. | `width`, `color` |
| `StarOrn` | ✦ star asterisk SVG. | `size`, `color` |
| `ReceiptLine` | Single line on the till receipt. | `qty`, `name`, `sub`, `price` |
| `FieldRow` | Label/value row inside checkout cards. | `label`, `value`, `mono` |
| `BookmarkPreview` / `StickerPreview` / `JournalPreview` | Small iconographic placeholders inside product cards. | `accent` |

**Important on the previews:** The bookmark/sticker/journal "previews" inside cards are **placeholders** — flat shapes, no real product art. When real Printful mockups exist, swap these for real product photography (still on the warm-paper background, still sticker-bordered).

The big "Neon Roadcat" art on the product hero is a one-off illustration of the app icon's elements (cyan glow, pink shooting star, orange book outline) — replace with the real foil-stamp scan when available.

---

## Assets

Bundled in `design_files/trading_post/assets/`:

- `cat-store.png` — Mister Ollie in his Trading Post chair, painted in the brand illustration style. **Always alt-text "Mister Ollie in his Trading Post chair".** Used on the Shop hero only.

Not yet provided (request from brand):
- A wooden-sign SVG with real burnt-edge texture (the prototype renders this with gradients + clip-path).
- Real product photography / mockups for the bookmarks, journals, stickers.
- Printful mockup URLs by variant.

---

## Files in this handoff

Inside `design_files/`:

| File | What it is |
|---|---|
| `Trading Post Redesign.html` | The design-canvas wrapper that renders all three screens side-by-side. **For viewing only** — `design-canvas.jsx` and `ios-frame.jsx` are mocks and not part of the production handoff. |
| `colors_and_type.css` | The full Literary Roads design-token sheet. This already exists in the codebase. |
| `trading_post/components.jsx` | All shared components: WoodenSign, MileageMarker, LuggageTag, Postcard, Stamp, ShopHeader, SatchelButton, AddToSatchelChip, previews, ornaments. |
| `trading_post/shop.jsx` | The Shop screen — hero, three display cases, proprietor note, sticky till bar. Cart state lives here in the prototype; in production, lift to a global store. |
| `trading_post/product.jsx` | The Product detail screen — large luggage-tag hero, color chips, qty stepper, spec ticker, pairs-with row. |
| `trading_post/checkout.jsx` | The Checkout screen — receipt-roll layout, ship-to + pay-with cards, Stripe-styled pay button. |
| `trading_post/assets/cat-store.png` | Mr. Ollie illustration. |

To re-open the prototype: open `Trading Post Redesign.html` in any modern browser. No build step.

---

## Implementation order (suggested)

1. Wire up the token map — confirm `colors_and_type.css` is already loaded site-wide. If not, import it.
2. Build the leaf primitives first: `Stamp`, `MileageMarker`, `Squiggle`, `StarOrn`, `PaperTexture`, `ColorChip`, `QtyStepper`.
3. Build the wooden + tag components: `WoodenSign`, `LuggageTag`, `Postcard`, `SatchelButton`, `AddToSatchelChip`.
4. Build the page shells with mock data, validate against the prototype.
5. Wire cart state + the sticky till bar.
6. Wire product detail (variant selection, qty, add-to-cart side effect).
7. Wire checkout against Stripe — start with the test-mode Payment Element.
8. Plug in Printful product list + fulfillment webhook.
9. QA on small viewports (the iOS frame is 390px; ensure 320px also works).
10. Accessibility sweep — keyboard, screen reader, focus rings on all sticker buttons.

---

## Open questions for product

- Confirm the four bookmark / three journal / four sticker SKUs above — are these the launch list?
- Pricing pack-of-three bundle (e.g. 3 bookmarks for $30): one Printful SKU per pack, or a frontend bundling rule?
- Tax service — Stripe Tax, TaxJar, manual?
- Order confirmation page — out of scope of this design, but should also wear the receipt motif.
- Saved addresses / accounts — does the Literary Roads app have a user account system this can read from, or is the store one-shot guest checkout?
