# Thrash Kan Kidz - Product Requirements Document

## Original Problem Statement
Build a mobile card collecting app for "Thrash Kan Kidz" cards where users:
- Log in to receive coins
- **Spin a roulette wheel** to get random cards (gacha system)
- View their collection (showing owned vs missing cards)
- Trade duplicate cards with other users
- Unlock special cards through achievements and milestones
- Buy coins with real money (Stripe integration)

## Core Features

### Series System (March 2026)
Cards are organized into series. Users must complete one series before accessing the next:
- **Series 1**: 16 cards (8 bands × 2 cards each: A & B)
- **Series 2-4**: Future series (same structure)
- Completing a series unlocks:
  - A **Rare card reward**
  - Access to the **next series**

**Series 1 Bands (UPDATED March 15, 2026):**
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

**Series Rewards:**
- Series 1 → **Kerry The King** (Rare) - "Kerry the King rules the stage with a monstrous ego and an even more monstrous scowl."
- Series 2 → Tardy Donald (Rare)
- Series 3 → Martin Van Druid (Rare)
- Series 4 → Jeff Possess Ya (Rare)

### Card Spinner (Gacha System)
Users spin a roulette wheel to randomly win cards from their current series:
- **Spin Cost**: 50 coins per spin
- **Duplicates**: Added to collection for trading
- **Visual**: Animated wheel with card previews, progress bar, series info

### Coin Purchase System (Implemented Feb 27, 2026)
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
  - `screens/home/index.tsx` - Home/Login screen
  - `screens/shop.tsx` - Card Spinner roulette wheel
  - `screens/collection/index.tsx` - User's card collection
  - `screens/goals/index.tsx` - Goals and achievements
  - `screens/profile/index.tsx` - User profile
  - `screens/trade.tsx` - Card trading (placeholder)
  - `screens/privacy.tsx` - Privacy Policy
  - `screens/payment-success.tsx` - Payment confirmation
  - `components/BuyCoinsModal.tsx` - Coin purchase modal

### Key API Endpoints
- `POST /api/users` - Create user
- `GET /api/users/{user_id}` - Get user data
- `POST /api/users/{user_id}/daily-login` - Claim daily bonus
- `POST /api/users/{user_id}/spin` - Spin the wheel for a random card
- `GET /api/users/{user_id}/spin-pool` - Get available cards in spin pool
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
  "rarity": "common|rare",
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

### March 15, 2026 - Series 1 Card Update & UI Changes
- ✅ **Updated all 16 Series 1 cards with user-provided artwork**
  - 8 bands with unique card images (front + back for each)
  - New band names: $LAYA, Megadef, Sepulchura, Testyment, Metallikuh, Anthrash, Kreaturd, Eggsodus
  - New card names and descriptions matching artwork
  - All image URLs updated to user-provided assets
- ✅ **Kerry The King is now Series 1 rare reward**
  - Updated with new artwork (front + back)
  - Martin Van Druid moved to Series 3 reward
- ✅ **Hidden unowned cards in Collection view**
  - Unowned cards now show as mystery boxes with "❓" and "???"
  - Card images AND names are hidden until collected
  - Creates mystery/excitement for undiscovered cards
- ✅ **Cleaned up deprecated cards**
  - Removed Epic streak cards (tom_angeltipper, tom_angelflipper)
  - Removed old engagement milestone cards
  - Kept 4 rare reward cards for series completion

### Previous Sessions
- Full card spinner roulette wheel
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
1. (P0) Expo Go error on mobile device - may need cache clear
2. (P1) TouchableOpacity login button unreliable in web preview
3. (P3) Web preview scrolling can be unreliable on long lists

## Upcoming Tasks
1. Implement Series 2+ cards (need artwork)
2. Card trading feature
3. App store submission process (binary build, App Store Connect setup)

## Future/Backlog
- Add In-App Purchases (IAP) for iOS/Android native checkout
- Re-introduce engagement milestones as long-term goals
- Purchase receipts/confirmation emails
- Refactor server.py into separate route/model files
- Improve scrolling performance with @shopify/flash-list
