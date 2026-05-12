# Thrash Kan Kidz — Product Requirements

## Original problem statement
A mobile card-collecting game featuring thrash/death metal parody cards (Garbage
Pail Kids style). Built with React Native (Expo SDK 54) + FastAPI + MongoDB.

## Status
- **Live on Google Play Production** (v77 shipping).
- Custom domain `thrashkankidz.com` mapped via Porkbun → Cloudflare Pages.
- 527 cards seeded (Series 1–6 fully released; Series 7 "Grind Edition" seeded
  through Band 4 + reward card, gated until **2026-05-17 00:00 CDT**).

## Architecture
```
/app
├── backend
│   ├── server.py                # Core API + pack-open + spin/wheel logic
│   ├── series_config.py         # Series release schedule
│   ├── routers/{cards,diagnostics,static_pages}.py
│   └── data/cards_data.py       # CARD_IMAGE_URLS, CARD_BACK_IMAGE_URLS,
│                                # RARE_CARD_ACHIEVEMENTS, VARIANT_SCRATCH_COVERS,
│                                # INITIAL_CARDS (master catalog)
└── frontend
    ├── app.json / eas.json      # versionCode 77 live; need bump for v78
    ├── app/{index,collection,shop,trade,profile,goals}.tsx
    └── src/components/{ScratchCard,BuyCoinsModal,RewardGlow}.tsx
```

## What's done
- **2026-05-12 (this session):**
  - Series 7 Bands 1–4 seeded (40 variant cards) + Alien Dubin reward card
    (epic, unlocks at 112 cards completed). Total catalog = 527 cards.
  - Reward glow now rarity-aware: red for epic, gold for rare.
  - Scratch-off variant reveal feature built (see below).
- **Earlier (handoff context):**
  - Live on Google Play v77.
  - Custom domain + Cloudflare landing page deployed.
  - Mini-games (Daily Wheel, Card Picker) moved to Home screen.
  - Collection TDZ crash fixed.
  - Scheduled series releases with `series_config.py` + notification system.
  - Privacy Policy + Delete Account pages live on Render.

## Scratch-off variant reveal (2026-05-12, new feature)
**Scope:** When a variant card is pulled from a pack, show a finger-drag
scratch overlay themed to the variant. User scratches ~55% to reveal the
art beneath. One-time animation per pack-open; not persisted.

**Implementation:**
- `@shopify/react-native-skia` rejected in favor of `react-native-svg`
  (~600KB vs ~5MB). True SVG-mask scratch with PanResponder.
- Backend Card model has `scratch_cover_url: Optional[str]`. Populated on
  the fly from `VARIANT_SCRATCH_COVERS` dict keyed by lowercase
  variant_name. Applied to all 4 cards-router endpoints + 3 server.py
  pack-open endpoints.
- Frontend wraps the pack-reveal `ExpoImage` in `<ScratchCard>` when
  `card.is_variant && card.scratch_cover_url`. Next/Awesome button is
  hidden until `scratched=true`.
- Graceful fallback: variants without a registered cover skip the overlay
  entirely — no UX regression while covers are uploaded.

**Status:** Plumbing complete. Awaiting 28 cover artworks from user
(Blacklight, Chrome, Digital, Melted, Toxic, Electric, Hellfire, Cosmic,
Bloodbath, Ice, Psychedelic, Biomechanical, Organic, Metal, Steampunk,
Glitched, Stoned, Cybernetic, Frosted, Magma, Stormy, Decayed, Skeletal,
Shadow, Oceanic, Mutant, Camouflage, Cheesy, Diamond, Vintage).

## Prioritized backlog
### P0
- Complete Series 7 seeding: Bands 5–8 (~40 cards remaining)
- Upload variant scratch covers (28 variants) — adds them to
  `VARIANT_SCRATCH_COVERS` in `cards_data.py`

### P1
- Build & ship **v78 AAB** — bundles new `react-native-svg` dep and
  scratch-off feature. Bump `versionCode` in app.json + eas.json.
- Verify Series 7 reward-card unlock logic (server.py checks `rarity:"rare"`
  but reward cards are `rarity:"epic"` — confirm Nicklebag Darrell / Alien
  Dubin actually unlock at 96 / 112 cards).
- Monitor Play Console for foreground service declaration response on
  `expo-notifications`.

### P2
- Landing page upgrades: screenshots, card grid, email signup form on
  Cloudflare Pages site.
- Refactor `server.py` Phase 2: decouple users/trades/shop/spin/payments
  into `/app/backend/routers/` (currently only cards, diagnostics,
  static_pages are split out).

### P3
- iOS App Store release (requires Apple Developer enrollment + StoreKit
  rebuild for IAPs).

## Test credentials
See `/app/memory/test_credentials.md`.
