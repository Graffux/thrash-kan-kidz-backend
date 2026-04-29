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
- P1: Confirm Google Play Store review
- P0: Series 6 content — Bands 1 & 2 COMPLETE. 6 bands remaining + 1 reward card. Variants use new theme: Stormy / Decayed / Camouflage / Vintage.

## Completed (April 29, 2026 — Series 6 progress)
- Series 6 Band 1 "The Grate Catt" fully wired: KATaclysm + KATatonic base cards plus all 8 variants (Stormy, Decayed, Camouflage, Vintage). DB: 415 cards.
- Series 6 Band 2 "Mercyful Fart" fully wired: King Diamondback + King Demond base cards plus all 8 variants. DB: 425 cards total.

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

