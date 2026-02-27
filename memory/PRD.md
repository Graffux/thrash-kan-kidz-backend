# Thrash Kan Kidz - Product Requirements Document

## Original Problem Statement
Build a mobile card collecting app for "Thrash Kan Kidz" cards where users:
- Log in to receive coins
- Purchase cards from a shop
- View their collection (showing owned vs missing cards)
- Unlock special cards through achievements and milestones
- Buy coins with real money (Stripe integration)

## Core Features

### Card Tiers & Unlocks
1. **Common Cards** - Purchasable from shop (50 coins each)
2. **Rare Cards** - Unlock after collecting certain number of cards:
   - Martin Van Druid: 10 cards
   - Tardy Donald: 20 cards
   - Kerry The King: 30 cards
   - Jeff Possess Ya: 40 cards
3. **Epic Cards** - Unlock after consecutive login streaks:
   - Tom Angeltipper: 7-day streak
   - Tom Angelflipper: 14-day streak
4. **Milestone Cards** - Free random common card every 10 cards collected
5. **Coming Soon Cards** - Visible but unavailable for purchase

### Engagement Milestones (Implemented Feb 20, 2026)
Special "Coming Soon" cards unlocked by meeting engagement criteria:
- **Dedicated Fan** (30-day login streak) → Unlocks "Maxi Pad"
- **Big Spender** (750 total coins spent) → Unlocks "Musty Dave"
- **Monthly Master** (20 days login in single month) → Unlocks "Chum Araya"

### Coin Purchase System (Implemented Feb 27, 2026)
Users can purchase coins with real money via Stripe:
| Package | Base Coins | Price | Coins/$ |
|---------|-----------|-------|---------|
| Starter Pack | 200 | $1.99 | ~100 |
| Collector Pack | 500 | $4.99 | ~100 |
| Ultimate Pack | 1000 | $9.99 | ~100 |

**First Purchase Bonus:** New users get **50% extra coins** on their first purchase!
- Starter: 200 + 100 bonus = 300 coins
- Collector: 500 + 250 bonus = 750 coins  
- Ultimate: 1000 + 500 bonus = 1500 coins

Features:
- Stripe Checkout integration for secure payments
- First-purchase bonus (50% extra coins)
- "Best Value" indicator on Ultimate Pack
- Coins per dollar display for savings comparison
- Payment transaction history tracking
- Automatic coin crediting after successful payment
- Webhook support for payment confirmations
- IAP structure prepared for future iOS/Android native purchases

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
  - `shop.tsx` - Card shop with all tier sections
  - `collection.tsx` - User's card collection
  - `goals/index.tsx` - Goals and achievements
  - `profile/index.tsx` - User profile
  - `trade.tsx` - Card trading

### Key API Endpoints
- `POST /api/users` - Create user
- `GET /api/users/{user_id}` - Get user data
- `POST /api/users/{user_id}/daily-login` - Claim daily bonus
- `POST /api/users/{user_id}/purchase-card` - Buy a card
- `GET /api/users/{user_id}/check-rare-cards` - Check rare card unlock status
- `GET /api/users/{user_id}/check-epic-cards` - Check epic card unlock status
- `GET /api/users/{user_id}/check-engagement-milestones` - Check engagement milestone status (NEW)
- `GET /api/users/{user_id}/goals` - Get user's goal progress

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
  "unlocked_rare_cards": ["card_id", ...],
  "unlocked_epic_cards": ["card_id", ...],
  "unlocked_engagement_cards": ["card_id", ...]
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
  "achievement_required": "int|null",
  "streak_required": "int|null",
  "engagement_milestone": "dedicated_fan|big_spender|monthly_master|null"
}
```

## What's Been Implemented

### February 20, 2026
- ✅ **Engagement Milestones Feature**
  - Added tracking for `total_spent_coins` and `monthly_logins` in user model
  - Created 3 engagement milestone cards (Maxi Pad, Musty Dave, Chum Araya)
  - Added `check_engagement_milestones` function for automatic unlocking
  - Added `/api/users/{user_id}/check-engagement-milestones` endpoint
  - Updated purchase endpoint to track spending
  - Updated daily login to track monthly logins
  - Added Engagement Milestones section UI in shop.tsx

### Previous Sessions
- Full card shop with Common, Rare, Epic, Coming Soon sections
- Collection view with card flip animation
- Goals system with coin rewards
- Daily login bonus with streak tracking
- Tab navigation (Home, Collection, Shop, Goals, Trade, Profile)
- Custom logo and background theming

## Pending Issues
1. (P2) Cliff Diver card image may appear missing - likely mobile caching issue
2. (P3) Web preview scrolling can be unreliable

## Upcoming Tasks
- Privacy Policy screen for app store compliance
- App store submission process

## Future/Backlog
- Refactor server.py into separate route/model files
- Refactor shop.tsx into smaller components
- Improve database seeding logic
