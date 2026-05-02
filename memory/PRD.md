# Thrash Kan Kidz - Product Requirements Document

## Overview
Mobile card-collecting app featuring thrash/death metal parody cards. Users open card packs, acquire random cards with series-based progression, and trade duplicates for alternate art variants.

## Tech Stack
- **Frontend**: React Native (Expo), deployed via EAS to Google Play
- **Backend**: FastAPI, deployed to Render.com
- **Database**: MongoDB Atlas (production)
- **Billing**: Google Play Billing via `react-native-iap`

## Core Features (Implemented)
- Card pack opening (50 coins per spin)
- Series 1-5 fully populated (405 cards total: 80 base + 320 variants + 5 reward)
- Series toggle in shop UI
- Variant trade-in system (5 dupes -> random variant)
- 200-coin bonus for completing all 4 variants of a card
- Duplicate cap: max 6 per base card, 70% priority on unowned cards
- User-to-user trading with notification badge
- Google Play Billing (IAP) with backend verification
- Privacy policy and delete account endpoints for Play Store compliance
- Custom Expo plugin to block READ_MEDIA_IMAGES permission

## Key Architecture Notes
- Frontend API URL is hardcoded as fallback in `app.json` extra config (EAS strips `.env`)
- Backend seed skips if 405 cards exist (prevents cold-start delays on Render)
- Targeted name_fixes dict in seed_database() handles DB corrections without full re-seed

## Series Content
- Series 1: 16 base + 64 variants + 1 reward = 81 cards
- Series 2: 16 base + 64 variants + 1 reward = 81 cards
- Series 3: 16 base + 64 variants + 1 reward = 81 cards
- Series 4: 16 base + 64 variants + 1 reward = 81 cards
- Series 5: 16 base + 64 variants + 1 reward = 81 cards

## Completed (April 19, 2026)
- In-app feedback system (Profile → Send Feedback) with 1-5 star ratings + text
- Backend endpoints: POST /api/feedback, GET /api/feedback (admin)
- Fixed user cards crash (missing acquired_at/quantity fields) — affected Drifter7 and others
- New users start with 500 coins (was 100)
- Admin coin top-up endpoint: POST /api/admin/add-coins/{user_id}
- Fixed "Jeff Possess Ya" card names in DB
- Added Series 5 tally with flexWrap layout fix
- Force-pushed code to Graffux-spec repo for Render deployment
- Collapsible series sections in Collection page (tap to expand/collapse each series)
- Reward cards now visible in their respective series section
- Swapped Chum Araya Hellfire/Cosmic images (were reversed)
- Swapped Party Tardy Diamond/Oceanic images (were reversed)
- Switched to expo-image for trade-in and spinner result images (fixes blank images on Android for large PNGs)
- Fixed Mille Vanille variant descriptions (said "Silly Mille" instead of "Mille Vanille")
- Bigger spin result card image (180x260) with background fallback
- Friends system backend complete (send/accept/reject requests, search by username/code, friend codes, trade gating)
- Transferred Hellbound cards (100) to hellboundjeff@gmail.com account

## In Progress
- COMPLETED: Daily Wheel + Medal System + Pack Reroll

## Completed (April 20, 2026)
- Daily Spin Wheel: Popup on app open, 8 prize slices, 7-day streak bonus, animated spin
- Medal System: Earn from wheel, spend on rerolls (3 medals) or free packs (10 medals)
- Pack Reroll: After opening, spend 3 medals to replace all 3 cards with new random ones
- 3-card packs at 75 coins (was 1 card at 50)
- Friends system: Search by username/code, send/accept requests, gate trading behind friendship
- Friends UI on Trade page with tabs, friend codes, and trade-with button

## Upcoming
- P1: Apply for Google Play Production Access on Day 14. Use draft answers in `/app/memory/play_production_questionnaire.md`.
- P1: Push final `/app/backend/server.py` + `cards_data.py` to Render so production gets Series 6 unlocked + the new milestone endpoint.

## Completed (May 2, 2026 — bug bash + flip animations)
- **#3 Sound replay race fixed**: `expo-audio` `seekTo()` is async; old code called `play()` synchronously after, sometimes firing while position was still at end → silence. Now `seekTo(0).then(play())` chain. Helps every SFX in the app.
- **#5–9 Card art swaps fixed**: Frank Bile-O, Frank Gello, Tranquilized Adam, Blainiac Cooke, Sadam Tranquilli, and Frank Bile-O Decayed variant fronts replaced with correct artwork in `cards_data.py`.
- **Image-URL drift sync added**: `seed_database` fast-path (when card_count matches expected) now syncs `front_image_url` / `back_image_url` from `cards_data.py` → DB on every boot. Fixed 8 cards on first boot. Future art swaps no longer require a destructive re-seed.
- **#10 Series 6 reward backfill**: Bug — completion gate was `series_num not in completed_series`, which left users stranded if the series was added to `SERIES_CONFIG` after they completed it. Changed gate to "reward not yet owned". Added startup migration that scans every (user, series) and grants any missing reward + marks completed_series.
- **#11 Series 6 in Goals**: Added `goal_all_variants_s6`. `seed_database` now backfills user_goals for all existing users when a new goal is added.
- **#2 Card flip animations**:
  - Card Detail modal: tap → 3D rotateY animation (450ms) with mid-flip texture swap.
  - Collection grid thumbnail: long-press (250ms) → in-place flip animation. Single tap still opens modal. New `SimpleCardOwned` component manages local flip state per card.
- **#4, #12** are already correct in code (REROLL_COST_MEDALS=1; Card Picker prize_label) — pending new EAS build to roll out to clients.

### Future-proof series catalog (NEW)
- New endpoint `GET /api/series/list` returning `{max_series, series: [{series, name, description, cards_required, has_reward}]}` — public, derived from `SERIES_CONFIG`.
- Frontend `collection.tsx` refactored:
  - `seriesNumbers` derived from `allCards` (unique sorted series values), not a hardcoded array.
  - Milestone-detection effect iterates the derived list, no `<= 6` cap.
- **Adding Series 7+ is now a single-line backend change**: `SERIES_CONFIG[7] = {...}`. All caps lift automatically. The frontend will pick up the new series the next time it fetches `allCards` — **no app rebuild required for new series content**.

## Completed (May 2, 2026 — SERIES 6 100% COMPLETE 🎉 + Milestone Celebration)
- Series 6 Band 7 "Diseased": King Fouley variants (Stormy/Decayed/Camouflage/Vintage) wired into INITIAL_CARDS (URLs were present from prior session but card definitions were missing).
- Series 6 Band 8 "Succubus": Moses Howler variants wired (URLs + INITIAL_CARDS).
- Series 6 Band 8 "Succubus": Frantic Howler variants wired (URLs + INITIAL_CARDS).
- DB total: 486 cards (was 474). All 12 inserts confirmed via `/api/cards/{id}` GET probes (HTTP 200, series=6).
- Series 6 final tally: 16 base + 64 variants + 1 reward (Nicklebag Darrell) = 81 cards, matching Series 1-5.

### Series Completion Milestone Celebration (NEW)
- New User field `series_milestone_claimed: List[int]` (idempotency guard).
- New endpoint `POST /api/users/{user_id}/series-milestone/{series}`:
  - Validates user owns ALL cards (base + variants + reward) for the series (81 cards each).
  - Atomically awards **+200 medals** and stamps the series into `series_milestone_claimed`.
  - Idempotent: subsequent calls return `claimed=false, already_claimed=true`.
  - Verified live: 1st call awards 200, 2nd call no-op, invalid series 400, partial collection rejected. Tested for both Series 1 and Series 6.
- Frontend `collection.tsx`:
  - On userCards/allCards change, scans all 6 series; for any 100%-complete series not yet claimed, fires the endpoint.
  - Animated full-screen overlay: pulsing skull + flames + "SERIES X COMPLETE" + dashed gold "+200 MEDALS" reward + tagline.
  - **Native Share button** ("BRAG TO YOUR CREW") → React Native `Share.share()` with pre-filled message and game URL → free organic marketing at production launch.
  - Per-session attempt guard prevents repeated POSTs while user lingers on tab.
  - `data-testid` added: `series-milestone-overlay`, `series-milestone-share-btn`, `series-milestone-close-btn`.

### Share-this-Card button (NEW, May 2 — virality boost)
- "SHARE THIS CARD" button added to the Card Detail modal in Collection.
- Uses `React.Native.Share.share()` with pre-filled metal-flavored caption (card name + variant + series + description + game URL) and the front image URL — every share becomes a free TikTok / Discord / IG ad.
- `data-testid="card-share-btn"`.

## Completed (May 1, 2026 — Series 6 base cards complete + bug fixes + cloud build)

### Series 6 base cards — ALL 8 BANDS COMPLETE
- Band 6 "Butt Feast": Tranquilized Adam + Sadam Tranquilli
- Band 7 "Diseased": King BROWley + King Fouley
- Band 8 "Succubus": Moses Howler + Frantic Howler
- DB total: 462 cards (all 16 Series 6 base characters now present).

### Production-time bug fixes (April 30 / May 1)
- Reroll cost mismatch: backend already had `REROLL_COST_MEDALS = 1` — needs Render redeploy.
- Trade-In stale-row failure: FE now drops the failed row + refreshes from server on error.
- Card Picker prize bug: backend was picking a RANDOM prize regardless of which pair the user matched. Now backend honors `prize_label` from FE; FE sends matched pair's label. Backward-compatible fallback retained.
- Mickey Muir front art (base + 4 variants) refreshed via `name_fixes` dict — auto-updates production DB on next backend boot.

### Cloud-build pipeline established (April 30)
- Frontend pushed to `Graffux/thrash-kan-kidz-frontend`. Expo project linked to repo via "Build with GitHub" feature with `/frontend` base directory.
- `eas-build-pre-install` hook added to package.json: runs `yarn install --ignore-engines` to pre-sync the lockfile, eliminating the `--frozen-lockfile` failures.
- `packageManager` field removed from package.json (was forcing strict corepack lockfile checks).
- `YARN_ENABLE_IMMUTABLE_INSTALLS=false` env added to eas.json production profile.
- v1.8.4 / versionCode 54 ready to build.

## Completed (April 29, 2026)

### Series 6 progress
- Series 6 Band 1 "The Grate Catt": KATaclysm + KATatonic + 8 variants
- Series 6 Band 2 "Mercyful Fart": King Diamondback + King Demond + 8 variants
- Series 6 Band 3 "Anfrax": Frank Gello + Frank Bile-O + 8 variants
- Series 6 Band 4 "The Amused": Blaine the Cook + Blainiac Cooke + 8 variants
- Series 6 Band 5 "Decel": Dan Cements + Handsome Dan + 8 variants
- Series 6 Reward Card: Nicklebag Darrell (Panterror, epic, unlocks at 96 cards)
- Series 6 pack cover wired into shop.tsx
- DB total: 456 cards.

### Bug fixes
- "Cards Collected" stat fixed in Profile (was showing 151%, now caps at 100%) — uses base-card-only filter.
- `axeImpactSound` ReferenceError eliminated in shop.tsx (3 silent failures → cardFlipSound now actually fires on each card reveal).

### Sound design overhaul
- New SFX: drum_roll (OPEN PACK!), bag_tear (TAP TO REVEAL!), card_flip (each of 3 reveals).
- All registered in `sounds.ts` shared global player layer (no Audio Track exhaustion).

### Backend modularization (Phase 2 — safe scope only)
- New: `routers/cards.py` (GET /cards, /cards/rare, /cards/epic, /cards/{card_id}). Self-contained Card model + Mongo connection.
- New: `routers/static_pages.py` (root, /health, /download/*, /privacy-policy, /delete-account).
- server.py: 3617 → 3448 lines (-4.7%). Auth, payments, IAP, spin, trades intentionally untouched ahead of production submission.

### New features (UX retention)
- **Per-band progress bars in Collection**: every series header now lists each band with `X/Y base + X/Y var` and a colored progress fill (green → gold when complete). Shows for all Series 1–6.
- **First-Variant Pulled celebration**: full-screen overlay banner (🔥 + variant name) fires once when user pulls any card with a variant_name they didn't already own before the pack open. Per-variant-name dedup, auto-dismisses 2.4s, prizeWonSound triggered.
- Series 6 added to Collection seriesNumbers list.
- Series header "/16 base" hardcode → dynamic `stats.baseTotal` (handles Series 6's incomplete state correctly).

## Completed (April 28-29, 2026 — current session)
- Sean Kill-Again reward card: new front image, back unchanged
- Card Picker mini-game live (8-card pair-match grid, 24h cooldown, prizes: 1 free pack / 1-3 medals)
- Reroll cost reduced 3 → 1 medal; UI label & visibility threshold updated; revealIndex resets to 0 after reroll + axe impact sound
- Mute toggles in Profile: separate Sound Effects + Music switches, persisted in AsyncStorage, music toggle reactive (pauses Collection bg immediately when turned off)
- 10 sound effects added: login_riff, card_flip, axe_impact, cash_register (Shop tab), tab_home/collection/trade/goals (tab presses), collection_bg (looping at 50%), clinking_coins (registered, unassigned)
- Sequential 3-card reveal: tap Next per card; removed `transform: scale(1.6)` that was crashing Android, replaced with 140×200 sizing + key-based remount
- Permission strip plugin extended: removes RECORD_AUDIO (added by expo-audio default)
- Login screen logo swapped to TM-marked variant
- Profile screen displays real version via Constants.expoConfig instead of hardcoded "v1.0"
- Card image fixes (backend-only via name_fixes): David Whine, David Slayne, Martini Walkyier, Darren Travesty fronts corrected
- Goals overhaul: removed coin/profile/3-day/7-day/50-card/all-rarities goals; added 30-day streak (300c), 60-day streak (600c), 100/150/200 cards (500/750/1000c), 5 series-variant master goals (500c each)
- Mille Vanille auto-grant on day 7 streak removed
- Restored real IAP via expo-iap@4.2.1 + expo-build-properties (Kotlin 2.1.20). BuyCoinsModal uses useIAP hook → fetchProducts → requestPurchase → backend verify → finishTransaction(consumable). Removed obsolete custom billing-plugin.js
- Backend modular refactor phase 1: extracted feedback (3 endpoints) + friends (5 endpoints) into /app/backend/routers/. server.py: 3601 → 3407 lines
- Card Picker UI: graceful "server updating" error state if endpoints return 404 (instead of bogus 0h0m cooldown)
- Git workflow: Emergent pushes to Graffux/thrash-kan-kidz-backend, user mirrors to Graffux-spec via `git push spec main` after each pull (Render watches Graffux-spec)

## Backlog
- Refactor remaining server.py endpoints into routers/: auth, daily_wheel, payments, cards, spin, trades, goals
- Split cards_data.py by series
- Server-side Google Play purchase token validation against Play Developer API
- Decide use case for clinking_coins.mp3 (registered but not yet wired)
- Next EAS build needs versionCode 52+ (50 and 51 already used in Play Console; 1.8.3 source is staged)

