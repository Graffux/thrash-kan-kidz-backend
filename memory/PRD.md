# Thrash Kan Kidz - Product Requirements Document

## Latest Update: March 28, 2026
- **PLAY STORE SUBMISSION READY!**
- Fixed app icons to be square (512x512)
- Fixed @types/react dependency version
- Generated Play Store feature graphic (1024x500)
- Captured 5 Play Store screenshots
- Created comprehensive Play Store listing document
- Privacy Policy already in app
- App versioning configured (1.0.0, versionCode 1)
- **BACKEND REFACTORING STARTED!**
- Created modular architecture: `/data`, `/models`, `/routes`, `/services`
- Extracted card data (3,217 lines) to `data/cards_data.py`
- Extracted goals data (56 lines) to `data/goals_data.py`
- Created `config.py` for app settings (94 lines)
- Created `database.py` for MongoDB connection (28 lines)
- Created Pydantic models in `models/` directory
- Route placeholders ready for future extraction
- **COLLECTION VIEW UI UPDATED!**
- Removed "Coming Soon" and mystery card placeholders
- Collection now shows ONLY owned cards
- Added series progress display (S1: X/16, S2: X/16, S3: X/16)
- Variant cards display with purple border and "VAR" badge
- Shows "+X Variants" count in header
- Empty state for users with no cards yet
- **SERIES 1 & 2 VARIANTS COMPLETE!**
- Added all 128 variant cards (64 per series)
- Series 1 variants: Toxic, Electric, Hellfire, Cosmic
- Series 2 variants: Bloodbath, Ice, Psychedelic, Biomechanical
- Universal variant back images for each type
- Total cards in DB: 180 (49 base + 128 variants + 3 rewards)

## Original Problem Statement
Build a mobile card collecting app for "Thrash Kan Kidz" cards where users:
- Log in to receive coins
- **Open card packs** to get random cards (gacha system)
- View their collection (showing owned vs missing cards)
- Trade duplicate cards with other users
- Unlock special cards through achievements and milestones
- Buy coins with real money (Stripe integration)

## Core Features

### Series System (March 2026)
Cards are organized into series. Users must complete one series before accessing the next:
- **Series 1**: 16 cards (8 bands × 2 cards each: A & B) → Reward: Kerry The King (Rare)
- **Series 2**: 16 cards (8 bands × 2 cards each: A & B) → Reward: Strap-On Taylor (Rare)
- **Series 3**: 16 cards (8 bands × 2 cards each: A & B) → Reward: Sean Kill-Again (Epic)
- **Series 4+**: Future series (same structure)

**Series 1 Bands:**
| Band | Card A | Card B |
|------|--------|--------|
| $LAYA | Slaya da Playa | Chum Araya |
| Megadef | Musty Dave | Dave's Mustang |
| Sepulchura | Maxi Pad | Maximum |
| Testyment | Billy Chuck | Chuck Roast |
| Metallikuh | Cliff Diver | Cliff Burpin |
| Anthrash | Scotch Ian | Scott Eaten |
| Kreaturd | Silly Mille | Mille Gorezza |
| Eggsodus | Paul Bawl Off | Blood Bonder |

**Series 2 Bands:**
| Band | Card A | Card B |
|------|--------|--------|
| Construction | Smeared Schmier | Beer Schmier |
| Voivodka | Piggy in a Blanket | Rotting Away |
| Hallows Heave | Tommy SteWART | Tommy SPEWart |
| Pussessed | Jeff Possess Ya | Chef Becerra |
| S.T.D. | Bully Milano | Billy Mylanta |
| Sodumb | Tom Angeltipper | Tom Angelflipper |
| Sacrud Ryche | Philled Up | Phil Grind |
| Dork Angel | Don Doody | Don Rotty |

**Series 3 Bands (ADDED March 22, 2026):**
| Band | Card A | Card B |
|------|--------|--------|
| Underkill | Nobby Blitz | Bobby Blitzed |
| Meadow Church | David Whine | David Slayne |
| Sabutt | Martini Walkyier | Martin Wankyier |
| Celtic Frosty | Tom G. Worrier | Tom G. Wore Out |
| Venum | Coronos | Groanos |
| Sadust | Darren Travesty | Daring Travis |
| High Racks | Cretin W. De Pena | Katon De Pain |
| Suckrifice | Rob Urinati | Slob Urbinati |

**Series Rewards:**
- Series 1 → **Kerry The King** (Rare) - "$LAYA"
- Series 2 → **Strap-On Taylor** (Rare) - "Sucrilege B.J."
- Series 3 → **Sean Kill-Again** (Epic) - "Violents"

### Card Pack System (Updated March 22, 2026)
Users open card packs to randomly win cards from their current series:
- **Pack Cost**: 50 coins per pack
- **Animation**: Pack shakes → Card slides out face-down → Tap to flip and reveal
- **Duplicates**: Added to collection for trading
- **Visual**: Animated card pack with series branding

### Coin Purchase System
Users can purchase coins with real money via Stripe:
| Package | Base Coins | Price | Coins/$ |
|---------|-----------|-------|---------|
| Starter Pack | 200 | $1.99 | ~100 |
| Collector Pack | 500 | $4.99 | ~100 |
| Ultimate Pack | 1000 | $9.99 | ~100 |

**First Purchase Bonus:** New users get **50% extra coins** on their first purchase!

### Goals System
- First Card: Collect first card (25 coins)
- Card Enthusiast: Collect 1 of each rarity (150 coins)
- Thrash Master: Collect 50 cards (250 coins)
- Streak Starter: 3-day login streak (50 coins)
- Dedicated Fan: 7-day streak (100 coins)
- Coin Collector: Collect 100 coins (25 coins)

## Technical Architecture

### Backend (FastAPI)
- `/app/backend/server.py` - Main server with all API endpoints
- MongoDB database with collections: users, cards, user_cards, goals

### Frontend (Expo/React Native)
- `/app/frontend/app/` - Main app screens
  - `index.tsx` - Home/Login screen
  - `shop.tsx` - Card Pack opener (updated from roulette wheel)
  - `collection.tsx` - User's card collection
  - `goals.tsx` - Goals and achievements
  - `profile.tsx` - User profile
  - `trade.tsx` - Card trading (placeholder)
  - `privacy.tsx` - Privacy Policy
  - `payment-success.tsx` - Payment confirmation
- `/app/frontend/src/components/` - Shared components
  - `BuyCoinsModal.tsx` - Coin purchase modal
  - `FlippableCard.tsx` - Card flip animation

### Key API Endpoints
- `POST /api/users` - Create user
- `GET /api/users/{user_id}` - Get user data
- `POST /api/users/{user_id}/daily-login` - Claim daily bonus
- `POST /api/users/{user_id}/spin` - Open card pack for a random card
- `GET /api/users/{user_id}/spin-pool` - Get available cards in current series
- `GET /api/cards` - Get all cards
- `POST /api/create-checkout-session` - Create Stripe checkout
- `GET /api/payment-success` - Handle successful payment

## Database Schema

### Users Collection
```json
{
  "id": "uuid",
  "username": "string",
  "coins": "int",
  "daily_login_streak": "int",
  "last_login_date": "string (YYYY-MM-DD)",
  "total_spent_coins": "int",
  "monthly_logins": {"YYYY-MM": [day1, day2, ...]},
  "unlocked_series": [1, 2, ...],
  "completed_series": [1, ...]
}
```

### Cards Collection
```json
{
  "id": "card_xxx",
  "name": "string",
  "description": "string",
  "rarity": "common|rare|epic",
  "front_image_url": "string",
  "back_image_url": "string",
  "coin_cost": "int",
  "available": "bool",
  "series": "int",
  "band": "string",
  "card_type": "A|B",
  "achievement_required": "int|null",
  "series_reward": "int|null"
}
```

## What's Been Implemented

### March 22, 2026 - Series 3 & Card Pack UI
- ✅ **Implemented all 16 Series 3 cards** (8 bands × 2 cards)
  - Underkill, Meadow Church, Sabutt, Celtic Frosty, Venum, Sadust, High Racks, Suckrifice
  - All with user-provided artwork
- ✅ **Sean Kill-Again Epic reward card** for Series 3 completion
- ✅ **Replaced roulette wheel with Card Pack opening mechanic**
  - Card pack box with series branding
  - Shake animation when opening
  - Card slides out face-down
  - "TAP TO REVEAL!" prompt with pulse animation
  - Flip animation to reveal card
- ✅ **Spread out tab bar icons** for better spacing
- ✅ **Added `series_reward` field** to Card model

### March 15-16, 2026 - Series 1 & 2 Updates
- ✅ Updated all 16 Series 1 cards with user-provided artwork
- ✅ Added all 16 Series 2 cards with user-provided artwork
- ✅ Kerry The King is Series 1 rare reward
- ✅ Strap-On Taylor is Series 2 rare reward
- ✅ Hidden unowned cards in Collection view (mystery cards)
- ✅ Cleaned up tab bar (hidden utility screens)

### Previous Sessions
- Full card spinner/pack system
- Series progression system
- Stripe integration for coin purchases
- Collection view with card flip animation
- Goals system with coin rewards
- Daily login bonus with streak tracking
- Tab navigation (Home, Collection, Shop, Goals, Trade, Profile)
- Custom logo and background theming
- Privacy Policy page
- Payment success handling

## Known Issues
1. (P0) Expo Go error on mobile device - "java.io.IOException: Failed to download remote update"
   - Try: Clear Expo Go app cache, reinstall Expo Go, check network/VPN
   - OTA updates already disabled in app.json
2. (P1) TouchableOpacity login button unreliable in web preview
3. (P3) Web preview scrolling can be unreliable on long lists

## Upcoming Tasks
1. ✅ ~~Implement Series 3 cards~~ (DONE)
2. Card trading feature
3. App store submission process (binary build, App Store Connect setup)
4. Add Series 4 cards (when artwork provided)

## Future/Backlog
- Add In-App Purchases (IAP) for iOS/Android native checkout
- Re-introduce engagement milestones as long-term goals
- Purchase receipts/confirmation emails
- Refactor server.py into separate route/model files
- Improve scrolling performance with @shopify/flash-list
