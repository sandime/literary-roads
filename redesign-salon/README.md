# Handoff: The Salon

## Overview

**The Salon** is Literary Roads' bimonthly community reading room — one book, two
months, the whole community reading it together and discussing it. It is the
app's most *considered* social space: quieter and slower than the rest of the
app (the swap meet, the map, Highway Snacks). The tone is a warm, candlelit
literary parlor.

A "period" runs for two months against a single selected book. Members **enroll**,
read at their own pace, and talk in a threaded conversation. When the period ends,
the discussion **closes** and a community review is published in the Gazette.

This handoff covers **7 deliverables**:
1. Entry screen — not enrolled (the invitation)
2. Entry screen — enrolled (welcome back)
3. Conversation screen — discussion cards + threaded replies + composer
4. Reply bottom sheet
5. Empty state
6. Profile card — three states (join / enrolled / review)
7. Gazette announcement card

---

## About the Design Files

The files in `design/` are **design references created in HTML/React-via-Babel** —
prototypes showing intended look and behavior. **They are not production code to
copy directly.** They run in a browser sandbox using inline Babel and global
`window` assignment, which is fine for a prototype but is not how you should ship.

Your task is to **recreate these designs in the target codebase's existing
environment**, using its established component patterns, styling system, state
management, and navigation. If the app is React Native / Expo, build native
components; if it's a React web app, use its component + styling conventions; etc.
Treat the JSX here as a precise visual + behavioral spec, not as importable modules.

> The prototype uses `Bungee`, `Special Elite`, and `Georgia`. These match the
> Literary Roads brand. Use the app's already-loaded brand fonts — don't add new
> font loaders if the app already provides equivalents.

---

## Fidelity

**High-fidelity.** Colors, typography, spacing, border treatments, and interaction
behavior are final. Recreate the UI pixel-faithfully using the codebase's existing
libraries. The one explicit placeholder is the **book cover** (see Assets) — the
prototype draws a styled stand-in; production must use the real cover image.

---

## Design Tokens

All values are taken from `design/salon/salon-kit.jsx` (the `S` object).

### Color
| Token | Hex | Use |
|---|---|---|
| `wine` | `#2A1A1F` | Primary screen surface |
| `wine2` | `#1F1318` | Deeper recess; sheet shadow base; progress-track bg |
| `wine3` | `#33222A` | Elevated card / input field background |
| `gold` | `#C9A84C` | The meaningful accent — usernames, hairlines, status dot, progress fill, countdown, char-count warning |
| `goldSoft` | `rgba(201,168,76,0.30)` | Card borders, gold rules, sheet top border |
| `goldDim` | `rgba(201,168,76,0.16)` | Faintest gold tint |
| `orange` | `#FF4E00` | The single call-to-action color per screen (YES, POST, ARE YOU IN) — never decorative |
| `cream` | `#FFF8E7` | Primary body text |
| `paper2` | `#E5D9C2` | Secondary text (author, quotes) |
| `muted` | `#A2908C` | Muted warm text |
| `muted2` | `#7C6A68` | Tertiary text / disabled outline / closed status |
| `line` | `rgba(201,168,76,0.16)` | Default hairline divider |

### Typography
| Family | Stack | Use |
|---|---|---|
| display | `"Bungee", system-ui, sans-serif` | "THE SALON" wordmark, button labels, countdown number, day-block headers |
| type | `"Special Elite", Georgia, serif` | Eyebrows, meta (timestamps, counts), char counter, dates |
| serif | `Georgia, "Times New Roman", serif` | **All reading body copy** — discussion text, book titles, quotes, invitations. This is a reading room; body is serif. |

Representative sizes (px): wordmark 12–26; button label 11–12.5; body 13–15;
card title 15–24; eyebrow/meta 9–11. Line-height ~1.4–1.5 on body. Letter-spacing
`0.04–0.18em` on Bungee/Special Elite labels; near-normal on serif body.

### Shape / elevation
- Card radius **14px**; buttons **10px**; inputs **12px**; bottom sheet **20px** top corners; avatars/dots full-round.
- Card border: `1px solid line` (or `goldSoft` for featured/gold cards). Gazette card is `2px solid gold`.
- Min touch target **46px** on buttons.
- Shadows are soft and dark: book cover `0 4px 14px rgba(0,0,0,.45)`; bottom sheet `0 -16px 40px rgba(0,0,0,.5)`. Gold glow `0 0 20px <gold/orange>55` only on the active CTA / progress fill.

### Background wash (screens)
```
radial-gradient(ellipse at 50% -8%, rgba(201,168,76,0.07) 0%, transparent 45%),
radial-gradient(ellipse at 90% 100%, rgba(255,78,0,0.04) 0%, transparent 42%)
over base #2A1A1F
```

---

## Core principles (do not violate)

1. **No emoji, anywhere.** Status is a colored dot; actions are words. (The whole app avoids emoji.)
2. **The book cover is always present** — every surface shows it. Use the real cover.
3. **Gold means something.** It marks identity (usernames), structure (hairlines), and progress. Don't spread it onto every divider or use it as a fill.
4. **One orange CTA per screen.** Orange is reserved for the single primary action; everything else is gold-outline, muted-outline, or ghost.
5. **The cat mascot appears on Entry and Empty only** — never on every screen.
6. **Animation is subtle.** Cards fade in; the reply sheet slides up; progress fills animate. No bounce, no spring.

---

## Screens / Views

> Reference renders: open `design/The Salon — Full Scale.html` for 1:1 device
> views, or `design/The Salon.html` for the annotated design-canvas. All sample
> data (Demon Copperhead, 231 members, 27 days) is placeholder.

### Shared: SalonHeader
Sticky top bar, `rgba(31,19,24,0.96)` + blur, bottom border `goldSoft`, padding `11×14`.
Row (gap 11, center-aligned): back chevron `‹` in gold 20px · 30×45 book cover ·
flexible column { "THE SALON" wordmark 12px Bungee gold; book title 12px italic serif `paper2`, ellipsis } ·
right block (when a period is active): countdown number 15px Bungee gold + "DAYS LEFT" 8.5px Special Elite `muted2`.

---

### 1. Entry — not enrolled (`SalonEntryJoin`)
**Purpose:** Invite a non-member into the current period.
**Layout:** Vertical, centered, padding `20×22`.
- Masthead: "THE SALON" 26px Bungee gold w/ `0 0 16px gold55` text-shadow; under it "A BIMONTHLY READING ROOM" 11px Special Elite `muted`, letter-spacing `0.14em`, uppercase.
- **Mascot**: `salon-cat.png`, 230×230, `object-fit: contain`, drop-shadow `0 14px 30px rgba(0,0,0,.5)`.
- Gold rule labeled "NOW READING".
- Book row (gap 16): 84×126 cover · column { title 21px bold serif cream; author 14px italic serif paper2; dates 11px Special Elite gold; "Next book announced May 1" 11px Special Elite muted }.
- Invitation: 15px italic serif paper2, centered, max-width 280 — *"Two months, one book, and a room full of readers taking it slow together."*
- Social proof: "231 Literary Roadsters are in." 12px Special Elite gold.
- **Primary CTA** (orange, full): "YES, I'M IN →". Below it ghost button "Maybe later".

### 2. Entry — enrolled (`SalonEntryEnrolled`)
**Purpose:** Welcome a returning member; show progress + a peek at activity.
**Layout:** `SalonHeader` (countdown 27) then padding `22×20`.
- Centered: "THE SALON" wordmark + active status dot; under it "Welcome back to the room." 16px italic serif paper2.
- **Progress card** (`SalonCard gold`, padding 16, row gap 16): 68×102 cover · column { title 17px bold serif; author 12.5px italic serif paper2; **gold progress bar** (track `wine2`, fill `gold` w/ glow, 55%); row "Day 33 of 60" / "27 days remaining" 10px Special Elite, right side gold }.
- Gold rule "LATEST IN THE ROOM".
- Two activity rows: 30px gold-ring avatar · { username 11px Bungee gold; quote 13px serif paper2; "12 replies" 10px Special Elite muted2 }. Divider `line` between.
- **Primary CTA** (orange, full): "GO TO THE SALON →".

### 3. Conversation (`SalonConversation`)
**Purpose:** The threaded discussion.
**Layout:** `SalonHeader` (countdown 27); body padding `14`; sticky composer at bottom.
- Meta row: "231 in the room · 48 speaking" 11px Special Elite muted (left); "Newest ▾" 11px Special Elite gold (right; sort control).
- **Discussion cards** (`DiscussionCard`), stacked, gap 12. Each (`SalonCard`, padding 14):
  - Header row: 34px avatar (gold ring if `isHostVoice`) · { username 12px Bungee — gold if host voice, else paper2; "2h ago" 10px Special Elite muted2 } · optional **SPOILERS** flag (9px Special Elite orange, 1px orange border, radius 4, pad `2×6`).
  - Body: 14.5px serif cream, line-height 1.5.
  - Action row (gap 16, margin-top 12): "{n} replies" button 11px Special Elite **gold** (toggles thread); "Reply" button 11px Special Elite muted (opens sheet — deliverable 4).
  - **Threaded replies** (revealed on tap): left padding 14, **left border `1px goldSoft`**, gap 12. Each reply: 26px avatar · { username 10.5px Bungee paper2 + time 9px Special Elite muted2; body 13px serif paper2 }.
- **Inline composer** (`ReplyComposerInline`, sticky bottom): blurred `rgba(31,19,24,.97)`, top border `goldSoft`, padding `10×12`. Row: 32px gold avatar · grow `wine3` field (radius 12) with auto-grow textarea, placeholder "Add to the conversation…", **600-char cap** · orange "POST" button (40px min-height).

### 4. Reply bottom sheet (`SalonReplySheet`)
**Purpose:** Compose a reply to a specific post.
**Layout:** Conversation dimmed behind (`brightness(0.4)`) + scrim `rgba(15,8,11,.55)`; sheet anchored bottom.
- Sheet: `wine` bg, **2px gold top border**, radius `20 20 0 0`, padding `8×18 20`, shadow `0 -16px 40px rgba(0,0,0,.5)`.
- Grab handle: 40×4 `muted2` pill, centered.
- "Replying to **{username in gold}**" 11px Special Elite muted; gold hairline under.
- **Quoted excerpt**: left bar 3px `goldSoft` + 13px italic serif muted, truncated.
- Field: `wine3`, border `line`, radius 12, padding `12×14`, min-height 92, 14px serif cream, autofocus, **600-char cap**.
- Footer row: `CharCount` (left — "{n} remaining" 11px Special Elite, turns **orange** under 60 left) · orange "POST REPLY →" button (right).

### 5. Empty state (`SalonEmpty`)
**Purpose:** Zero discussion cards yet.
**Layout:** `SalonHeader` (countdown 30); centered column, min-height 560.
- `salon-cat.png` 220×220 · "Be the first to speak." 22px bold serif cream · "The Salon is open." 15px italic serif muted · inline composer pinned at bottom.

### 6. Profile card — three states (`ProfileSalonCard`, prop `state`)
Compact 320-wide card for the user profile. `wine` bg, `goldSoft` border, radius 14, padding 16.
- **Top row:** "THE SALON" 12px Bungee gold (left) · status dot+label (right; absent in `join`).
- **Body row (gap 14):** 60×90 cover · content column (varies):
  - `state="join"`: author, dates (gold), "Next book: May 1" (muted). **Footer:** "Are you in?" 14px italic serif + row of orange "YES →" / ghost "Maybe later".
  - `state="enrolled"`: author, then **gold progress bar** + "27 days remaining" gold. **Footer:** gold-outline "GO TO THE SALON →".
  - `state="review"`: author, "See what readers said." italic muted. **Footer:** muted-outline "READ THE GAZETTE →".
- **State driver:** period open & not joined → `join`; open & joined → `enrolled`; period ended & review published → `review`.

### 7. Gazette announcement card (`GazetteSalonCard`)
The **only** Gazette feature card with a **full 2px gold border** (so it stands out in the Headlights feed). 340 wide, `wine` bg, radius 14, gold glow `0 0 24px gold22`.
- Eyebrow: `✦` + "THE SALON — NOW READING" 12px Bungee gold.
- Centered: 120×180 cover · title 24px bold serif cream · author 15px italic serif paper2 · dates 12px Special Elite gold · centered gold rule · "Join **231 Literary Roadsters** reading together this spring." 14.5px serif paper2 · orange "ARE YOU IN? →" full-width CTA.

---

## Interactions & Behavior

- **Enroll** (YES / ARE YOU IN): writes enrollment, transitions Entry → enrolled and the profile card join → enrolled. Optimistic; confirm with a subtle state change, no modal.
- **Reply count tap**: toggles the inline threaded replies on a `DiscussionCard` (local expand/collapse).
- **Reply button**: opens the bottom sheet (deliverable 4), pre-quoting the target post.
- **Composer / sheet**: hard cap input at **600 characters**; show remaining via `CharCount`, which turns orange under 60 remaining. POST is disabled when empty.
- **Sort control** ("Newest ▾"): toggles thread ordering (Newest / Oldest, and optionally "Host picks").
- **Period close**: when `endDate` passes, lock composers (read-only), flip status dot to `review`/`closed`, and surface the Gazette review link.
- **Transitions**: cards fade/slide in on mount (~200–300ms, ease-out); bottom sheet slides up from bottom with scrim fade; progress bar width animates. No bounce.

## State Management

```
salonPeriod = {
  id, bookTitle, bookAuthor, coverURL,
  startDate, endDate, memberCount,
  status: 'open' | 'review',          // drives status dot + card states
  gazetteReviewURL,
  nextBookAnnounceDate
}
enrollment = { joined: bool, daysRemaining: int, dayOf: int, totalDays: int }
thread[] = {
  id, user, isHostVoice, createdAt, spoiler, body,
  replyCount, replies: [{ id, user, createdAt, body }]
}
draft = { targetPostId | null, text }     // composer / sheet
ui = { expandedThreadIds: Set, sheetOpen: bool, sort: 'newest'|'oldest' }
```
- `daysRemaining` = ceil(`endDate` − now). `dayOf`/`totalDays` drive the progress bar width (`dayOf/totalDays`).
- Fetch the active period on Salon mount; paginate `thread[]`; lazy-load `replies` on expand if large.

## Assets

| Asset | Source | Notes |
|---|---|---|
| `assets/salon-cat.png` | Provided brand mascot (1024×1024, transparent PNG) | The Salon mascot — entry + empty screens only. Bundled in `design/assets/`. |
| Book cover | **Google Books API** primary image (`volumeInfo.imageLinks`) | The prototype's `BookCover` is a **placeholder**. In production, pass the real cover URL. Keep the subtle inner spine sheen + soft drop shadow from `BookCover`. Always render a graceful fallback (the styled title/author placeholder) when no image is available. |
| Fonts | Bungee, Special Elite, Georgia | Use the app's existing brand font setup. |

No emoji, no other icons — status uses a dot, actions use words.

## Files

```
design/
  The Salon.html                 ← annotated design-canvas of all 7 deliverables
  The Salon — Full Scale.html    ← 1:1 device + card viewer (interactive)
  salon/
    salon-kit.jsx                ← tokens (S), BookCover, buttons, card, status dot, avatar, char count
    salon-screens.jsx            ← the 5 screens + DiscussionCard + SalonHeader + sample data
    salon-cards.jsx              ← ProfileSalonCard (3 states) + GazetteSalonCard
  assets/salon-cat.png           ← mascot
  ios-frame.jsx, design-canvas.jsx  ← prototype scaffolding ONLY (do not port)
```

> `ios-frame.jsx` and `design-canvas.jsx` are prototype viewing scaffolds — they
> are not part of the feature and should not be recreated in the app.
