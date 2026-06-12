# Literary Roads — Project Memory

## Stack
- React + Vite, Tailwind CSS
- react-leaflet (Leaflet maps), Leaflet GeoJSON for state boundaries
- Firebase (curated landmarks + bookstores + coffeeShops collections), Mapbox Directions API, Wikipedia API
- **Google Places API removed** — was too expensive ($300 burned in 2 weeks on trial). All place data now served from Firestore, seeded from OpenStreetMap.

## Places Data Pipeline
- Bookstores + coffee shops + libraries etc. live in Firestore collections, seeded from OSM GeoJSON exports
- `src/utils/firestorePlaces.js` — all getNearby* functions query Firestore (lat bounding-box + haversine filter)
- `src/utils/nearbySearch.js` — orchestrates tiered-radius calls; route search samples every 15 miles
- Seed scripts in `scripts/`: `seed-bookstores.mjs` (from GeoJSON files), `fetch-coffeeshops-overpass.mjs` (Overpass API → Firestore, additive only)
- `fetch-coffeeshops-overpass.mjs` flags: `--upload`, `--states TX,CA`, `--resume Georgia`; dry run saves `coffee-shops-overpass-new.geojson`
- Chain filtering: name blacklist + OSM `brand:wikidata` tag presence = skip

## Color Palette (Tailwind custom colors)
- `midnight-navy` #1A1B2E
- `starlight-turquoise` #40E0D0
- `atomic-orange` #FF4E00
- `paper-white` #F5F5DC
- `chrome-silver` #C0C0C0

## Fonts
- `font-bungee` — headings
- `font-special-elite` — body/labels

## Screen Flow (App.jsx)
`loading` → `stateSelector` → `map`

- `loading`: Odometer.jsx (3s animation, odometer + fuel gauge)
- `stateSelector`: StateSelector.jsx — Leaflet USA map, GeoJSON multi-select states; passes `string[]` to App
- `map`: MasterMap.jsx — multi-state map with route planner

## Car Check-in Feature
- `src/utils/carCheckIns.js` — `CAR_TYPES`, `carImgSrc`, `saveSelectedCar`, `checkIn`, `deleteCheckIn`, `subscribeToLocationCars`
- `src/components/CarSelector.jsx` — 2×2 grid of car options with neon glow on selected
- Profile.jsx has "CHOOSE YOUR RIDE" section; saves to `users/{userId}.selectedCar`
- MasterMap: `userCar` read from user Firestore snapshot; `locationCars` managed via `carSubsRef` (one listener per visible bookstore/cafe)
- Firestore: `activeCheckIns/{locationId}/cars/{checkInId}` — expires 2h after check-in
- Shelf shows PARK HERE / PARKED ✓ + LEAVE buttons (bookstores/cafes, logged-in only)
- Car badge markers rendered in MapContainer above location pins (`iconAnchor: [14, 68]`)
- 5+ cars at same location → convoy starburst badge

## Save Route Feature
- Firestore: `users/{userId}/savedRoutes/{routeId}` (subcollection)
- Fields: `routeName`, `notes`, `startCity`, `endCity`, `selectedStates`, `routeCoordinates`, `stops`, `bookstoreCount`, `cafeCount`, `landmarkCount`, `createdAt`
- `src/utils/savedRoutes.js` — `saveRoute`, `subscribeToSavedRoutes`, `deleteSavedRoute`, `updateRouteName`
- `src/components/SaveRouteModal.jsx` — naming modal (z-[1004]); auto-fills "StartCity to EndCity"
- `src/components/MyRoutes.jsx` — list of saved routes with load/rename/delete; rendered inside RoadTrip MY ROUTES tab
- SAVE ROUTE button: desktop header (near CLEAR ROUTE), mobile floating pill (SAVE + CLEAR ROUTE); only shown when `route.length > 0 && user`
- RoadTrip overlay now has tabs: MY STOPS | MY ROUTES
- Loading a route: restores `route`, `visibleLocations`, `startCity`, `endCity`, closes overlay, fits map to route
- Guests cannot save routes (button hidden when not logged in)

## Road Trip Feature
- `src/utils/tripStorage.js` — localStorage CRUD (key: `literary-roads-trip`)
- `src/screens/RoadTrip.jsx` — full-screen overlay rendered inside MasterMap (z-[1002]); map stays mounted
- Trip state lives in MasterMap: `tripItems` (array), `tripIds` (useMemo Set), `showRoadTrip` (bool)
- Bag icon in header (top-right) with orange count badge; opens overlay
- "ADD TO TRIP" button in The Shelf is a toggle: shows "✓ IN TRIP" when already added (click to remove)
- No auth needed; localStorage persists across sessions on same device

## Pit Stop Rating Feature
- Firestore: `locationRatings/{locationId}` — fields: `yesVotes`, `noVotes`, `voters[]`, `hasStarburst`
- `src/utils/locationRatings.js` — `subscribeToRating`, `castVote`; exports `STARBURST_THRESHOLD=10`
- `src/components/PitStopRating.jsx` — "Would you recommend this pit stop?" with 👍/👎 buttons; compact once voted
- `PitStopRating` placed in Shelf between location name and tab bar (all location types)
- `starburstIds` Set in MasterMap; updated via `handleStarburstChange(locationId, hasStarburst)` callback from PitStopRating
- `createCustomIcon(type, hasStarburst)` — when `hasStarburst`: adds gold drop-shadow glow + starburst-rating.png overlay at top-right of pin
- Starburst badge (`/literary-roads/images/starburst-rating.png`) also shown next to location name in Shelf when 10+ yes votes

## Hitchhiker's Tale Feature
- Firestore: `hitchhikerStories/{locationId}` — single doc per location
- Fields: `title`, `locationName`, `locationPlaceId`, `createdBy`, `createdAt`, `sentences[]`, `sentenceCount`
- Sentence fields: `userId`, `userName`, `text`, `timestamp` (ISO string)
- Only bookstores and cafes get Tales (not landmarks)
- `src/utils/hitchhikerStories.js` — `subscribeToStory`, `addSentence`; exports `MAX_SENTENCES=100`, `MAX_CHARS=150`
- `src/components/HitchhikerTale.jsx` — Shelf tab panel (preview + Start/Read Full Story button)
- `src/components/TaleModal.jsx` — Full-screen overlay (z-[1003]); sentence list + textarea input
- Shelf tabs for bookstore/cafe: `shelfTab` state in MasterMap ('info'|'guestbook'|'tale'); resets on location change
- Tab bar renders as underline-style tabs below the location name
- Landmarks: no tab bar, Guestbook stays inline as before

## Guestbook Feature
- Firestore: `guestbooks/{locationId}/entries/{googleBooksId}` (doc ID = sanitized book.id, `/` → `_`)
- Fields: `bookTitle`, `bookAuthor`, `bookCover`, `googleBooksId`, `recommendations[]`, `recommendationCount`, `createdAt`, `updatedAt`
- `src/utils/guestbook.js` — Firestore CRUD: subscribeToGuestbook, checkBookExists, addBookEntry, addRecommendationToEntry
- `src/components/Guestbook.jsx` — Panel inside The Shelf; views: carousel → expanded | search → write
- Wired into MasterMap.jsx Shelf with `key={selectedLocation.id}` (forces remount on location change)
- Uses `selectedLocation.id` as `locationId` (stable: ALA=Firestore doc ID, Places=`g_placeId`, Wiki=`wiki_pageId`)
- Requires auth to write; guests see content but prompted to sign in
- Duplicate detection: `checkBookExists` before creating new entry
- The Shelf max-height bumped from 50vh → 65vh to accommodate Guestbook

## Key Files
- `src/App.jsx` — screen router with `screen` state + `selectedState`
- `src/screens/Odometer.jsx` — loading splash (3000ms)
- `src/screens/StateSelector.jsx` — USA map, GeoJSON from PublicaMundi GitHub CDN; fallback dropdown if fetch fails
- `src/screens/MasterMap.jsx` — accepts `selectedState` + `onHome` props; starts with `showPlanner: true`
- `src/config/config.js` — MAP_CONFIG (defaultCenter, defaultZoom)
- `src/utils/` — googlePlaces, wikipedia, firebaseLandmarks, mapbox

## MasterMap Navigation
- HOME button (top-left header, house icon) → always calls `onHome()`
- "← Change State" in planner → calls `onHome()`
- "Clear Route" button → resets route/cities, keeps user in same states (`showPlanner: true`)
- NEAR ME button (top-right) → shown when `!showPlanner`

## Multi-State Details (StateSelector)
- `selectedStates`: `Set<string>` in component; `useRef` mirrors it for stale-closure-safe event handlers
- `layersRef`: `{ [stateName]: LeafletLayer }` — imperative style updates on toggle (no re-mount)
- Styles: DEFAULT → SELECTED (turquoise fill+border) → HOVER (orange) → HOVER_SEL (orange fill, turquoise border)
- Bottom panel slides up (CSS translate transition) when ≥1 state selected; chips are removable
- `onStateSelect(string[])` — passes array to App.jsx → MasterMap as `selectedStates` prop

## MasterMap Multi-State
- Initial view: bounding-box center + zoom computed from all selected state centers
- `stateLabel`: 1 state → name; 2-3 → joined with " · "; 4+ → "N States"
- Geocoding: 1 state → appends state name; multiple → raw city input (user adds "City, ST" if ambiguous)

## GeoJSON Source
`https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json`
- Property key: `feature.properties.name` (full state name, matches STATE_CENTERS keys)
- Hover: imperative `layer.setStyle()` to avoid re-render issues

## Marker Types
- `landmark` — quill icon, paper-white glow
- `bookstore` — open book icon, atomic-orange glow
- `cafe` — coffee cup icon, starlight-turquoise glow

## Gazette Admin (Phase 3)
- See `memory/project_admin_uid.md` for admin Firebase UID
- `/gazette` route → `src/screens/AdminPanel.jsx` — 5-tab CRUD (Festivals, Indie Picks, Debut Authors, BookTok, Trip Reports)
- `/newsletter` route → `src/screens/NewsletterPreview.jsx` — featured content preview + Download/Copy JSON export
- `src/utils/newsletterAdmin.js` — `fetchAll`, `fetchFeatured`, `createItem`, `updateItem`, `deleteItem`, `ADMIN_UID`
- Firestore collections: `festivals`, `indiePicks`, `debutAuthors`, `bookTokPicks`, `tripReports`
- All docs have `featured: boolean`, `createdAt`, `updatedAt`
- Admin link in profile dropdown (visible to admin UID only), styled gold
- JSON export includes all 6 sections (5 curated + NYT from gazette-data.json) + mascotUrl

## Preferences
- No emojis in new code or UI: see `memory/feedback_no_emojis.md`

## Store
- Private until post-launch; no navbar/menu link until user asks — see `memory/project_store.md`
- Access via `/#/store` (HashRouter); Claude Design redesigning the page
- Hidden behind Firebase `storeEnabled: false` flag

## Author Tidbit Cards (State Map)
- Floating trapezoid cards shown on 600ms hover over a state in selection mode
- Currently link to Wikipedia; will eventually link to internal author database: see `memory/project_author_database.md`

## Highway Snacks (Podcasts)
- Firestore collection: `literary_podcasts`; fetched live on load in `src/screens/Resources.jsx`
- Update workflow (scripted): see `memory/project_podcast_workflow.md`

## Seeding / Auth
- No service account key, no email/password auth in scripts — use temporarily-open-rules pattern: see `memory/feedback_firestore_seeding.md`

## Bookstore Guides Feature
- Firestore: `bookstoreGuides/{guideId}` + subcollection `stores/{storeId}`; admin-write, public-read
- `src/utils/bookstoreGuides.js` — CRUD for guides + stops
- `src/screens/GuidesAdminTab.jsx` — admin tab in `/gazette`; guide list + per-guide stop editor
- `src/screens/GuideScreen.jsx` — standalone reading view at `/guide/:guideId`
- Resources.jsx NEWSSTAND section: Gazette card + published guide cards + coming-soon cards
- FIND ON MAP: searches Firestore `bookstores` by name (limit 20), narrows by city client-side; if found opens `?bookstoreId=ID`; if not found but has coords opens `?center=lat,lng&pinName=...` which drops a synthetic bookstore pin

## Additional Notes
- Book cover fallback pattern (Open Library 1×1 GIF issue): see `memory/feedback_open_library_covers.md`
- Complete Firestore rules reference: see `firestore.rules` in project root
- Festival data source + current count: see `memory/project_festivals_data.md`
- React effect ordering pitfall: see `memory/feedback_react_effect_ordering.md`
- Firestore rules deploy reminder: see `memory/feedback_firestore_rules_deploy.md`
