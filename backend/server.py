from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# =====================
# Models
# =====================

class Card(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    rarity: str  # common, rare, epic
    front_image_url: str  # URL to the front image
    back_image_url: str = ""  # URL to the back image
    coin_cost: int = 100
    available: bool = True  # Whether the card is available for purchase
    achievement_required: Optional[int] = None  # Number of cards needed to unlock (for rare cards)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    coins: int = 0
    daily_login_streak: int = 0
    last_login_date: Optional[str] = None
    profile_completed: bool = False
    bio: str = ""
    avatar_url: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCard(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    card_id: str
    quantity: int = 1
    acquired_at: datetime = Field(default_factory=datetime.utcnow)

class Goal(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    goal_type: str  # daily_login, profile_complete, collect_coins, collect_cards
    target_value: int
    reward_coins: int
    reward_card_id: Optional[str] = None

class UserGoal(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    goal_id: str
    progress: int = 0
    completed: bool = False
    completed_at: Optional[datetime] = None

class Trade(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    from_user_id: str
    to_user_id: str
    offered_card_ids: List[str]
    requested_card_ids: List[str]
    status: str = "pending"  # pending, accepted, rejected, cancelled
    created_at: datetime = Field(default_factory=datetime.utcnow)

# =====================
# Request/Response Models
# =====================

class CreateUserRequest(BaseModel):
    username: str

class UpdateProfileRequest(BaseModel):
    bio: Optional[str] = None
    avatar_url: Optional[str] = None

class ClaimDailyLoginRequest(BaseModel):
    user_id: str

class PurchaseCardRequest(BaseModel):
    user_id: str
    card_id: str

class CreateTradeRequest(BaseModel):
    from_user_id: str
    to_user_id: str
    offered_card_ids: List[str]
    requested_card_ids: List[str]

class TradeActionRequest(BaseModel):
    trade_id: str
    user_id: str
    action: str  # accept, reject, cancel

# =====================
# Seed Data
# =====================

CARD_IMAGE_URLS = {
    "silly_mille": "https://customer-assets.emergentagent.com/job_earn-cards/artifacts/rofaamfd_file_00000000e17071f582be5805f1e745cc.png",
    "scotch_ian": "https://customer-assets.emergentagent.com/job_earn-cards/artifacts/bfe7vlxj_file_00000000e86871fda14428df7c29ecbc.jpg",
    "chuck_roast": "https://customer-assets.emergentagent.com/job_earn-cards/artifacts/4tm2n04w_file_000000006b8071fdbfd0b8b8447216c1.jpg",
    "cliff_burpin": "https://customer-assets.emergentagent.com/job_earn-cards/artifacts/zcekiedi_file_0000000013e071fd85ece28d1911153b.png",
    "scott_eaten": "https://customer-assets.emergentagent.com/job_earn-cards/artifacts/zgbfbhem_file_00000000499871f888b862576600e427.png",
    "tom_da_playa": "https://customer-assets.emergentagent.com/job_earn-cards/artifacts/x9pn7yxa_enhanced-1771255929218.jpg",
    "billy_chuck": "https://customer-assets.emergentagent.com/job_earn-cards/artifacts/u4fz71ye_enhanced-1771256129678.jpg",
    "cliff_diver": "https://customer-assets.emergentagent.com/job_earn-cards/artifacts/9ty58q1e_enhanced-1771255741945.jpg",
    "blood_bonder": "https://customer-assets.emergentagent.com/job_earn-cards/artifacts/17uzbwmx_enhanced-1771256230913.jpg",
    # Rare achievement cards
    "martin_van_druid": "https://customer-assets.emergentagent.com/job_d1401514-883f-459a-9a0f-b23503598272/artifacts/1qvok3an_file_00000000b1bc71fda2cfbe35b2441dbe.png",
    "tardy_donald": "https://customer-assets.emergentagent.com/job_d1401514-883f-459a-9a0f-b23503598272/artifacts/4jtbdfkr_file_00000000bef871fdb4e76de0e490ad1a.png"
}

CARD_BACK_IMAGE_URLS = {
    "silly_mille": "https://customer-assets.emergentagent.com/job_earn-cards/artifacts/xnbwdtzm_enhanced-1771276393918.jpg",
    "scotch_ian": "https://customer-assets.emergentagent.com/job_earn-cards/artifacts/z1p5iwct_enhanced-1771276079050.jpg",
    "chuck_roast": "https://customer-assets.emergentagent.com/job_earn-cards/artifacts/k748ickv_enhanced-1771277329420.jpg",
    "cliff_burpin": "https://customer-assets.emergentagent.com/job_earn-cards/artifacts/zonv9a4q_enhanced-1771277427890.jpg",
    "scott_eaten": "https://customer-assets.emergentagent.com/job_earn-cards/artifacts/203eblu2_enhanced-1771276134869.jpg",
    "tom_da_playa": "https://customer-assets.emergentagent.com/job_earn-cards/artifacts/8u33xp9j_enhanced-1771276506337.jpg",
    "billy_chuck": "https://customer-assets.emergentagent.com/job_earn-cards/artifacts/67cnskj3_enhanced-1771277248056.jpg",
    "cliff_diver": "https://customer-assets.emergentagent.com/job_earn-cards/artifacts/ff6yk5mf_enhanced-1771277691515.jpg",
    "blood_bonder": "https://customer-assets.emergentagent.com/job_earn-cards/artifacts/cvjsunwj_enhanced-1771277815451.jpg",
    # Rare achievement cards backs
    "martin_van_druid": "https://customer-assets.emergentagent.com/job_d1401514-883f-459a-9a0f-b23503598272/artifacts/wzu9cgqo_file_00000000581c71fd9f6943c516c13338.png",
    "tardy_donald": "https://customer-assets.emergentagent.com/job_d1401514-883f-459a-9a0f-b23503598272/artifacts/aiui1nef_file_000000009e4871f8b270fdb6a2aa38de.png"
}

# Rare card achievement requirements
RARE_CARD_ACHIEVEMENTS = {
    "card_martin_van_druid": {"required_cards": 10, "name": "Martin Van Druid"},
    "card_tardy_donald": {"required_cards": 20, "name": "Tardy Donald"}
}

INITIAL_CARDS = [
    {
        "id": "card_silly_mille",
        "name": "Silly Mille",
        "description": "The wild guitarist who rocks harder than anyone! With his flying V guitar and legendary tongue-out pose, he brings the chaos to every show.",
        "rarity": "common",
        "front_image_url": CARD_IMAGE_URLS["silly_mille"],
        "back_image_url": CARD_BACK_IMAGE_URLS["silly_mille"],
        "coin_cost": 50,
        "available": True
    },
    {
        "id": "card_cliff_burpin",
        "name": "Cliff Burpin",
        "description": "The bass-slapping, fire-breathing beast! His legendary burps can melt faces from 50 feet away. Don't stand too close!",
        "rarity": "common",
        "front_image_url": CARD_IMAGE_URLS["cliff_burpin"],
        "back_image_url": CARD_BACK_IMAGE_URLS["cliff_burpin"],
        "coin_cost": 50,
        "available": True
    },
    {
        "id": "card_scotch_ian",
        "name": "Scotch Ian",
        "description": "The kilted warrior with a taste for fine spirits! His battle cry echoes through the highlands as he charges into the mosh pit.",
        "rarity": "common",
        "front_image_url": CARD_IMAGE_URLS["scotch_ian"],
        "back_image_url": CARD_BACK_IMAGE_URLS["scotch_ian"],
        "coin_cost": 50,
        "available": True
    },
    {
        "id": "card_chuck_roast",
        "name": "Chuck Roast",
        "description": "The devil's own pitmaster! With his pitchfork and hellfire grill, he serves up the hottest BBQ this side of the underworld.",
        "rarity": "common",
        "front_image_url": CARD_IMAGE_URLS["chuck_roast"],
        "back_image_url": CARD_BACK_IMAGE_URLS["chuck_roast"],
        "coin_cost": 50,
        "available": True
    },
    {
        "id": "card_scott_eaten",
        "name": "Scott Eaten",
        "description": "The unluckiest metalhead in the zombie apocalypse! Even undead creatures can't resist his legendary rhythm section.",
        "rarity": "common",
        "front_image_url": CARD_IMAGE_URLS["scott_eaten"],
        "back_image_url": CARD_BACK_IMAGE_URLS["scott_eaten"],
        "coin_cost": 50,
        "available": True
    },
    {
        "id": "card_tom_da_playa",
        "name": "Tom da Playa",
        "description": "The flashiest bassist in the game! With his leopard coat, gold chains, and skull-topped pimp cane, he brings the bling to every gig.",
        "rarity": "common",
        "front_image_url": CARD_IMAGE_URLS["tom_da_playa"],
        "back_image_url": CARD_BACK_IMAGE_URLS["tom_da_playa"],
        "coin_cost": 50,
        "available": True
    },
    {
        "id": "card_billy_chuck",
        "name": "Billy Chuck",
        "description": "The moonshine-chugging hillbilly rocker! Armed with his shotgun and XXX jug, he brings country chaos to the metal scene.",
        "rarity": "common",
        "front_image_url": CARD_IMAGE_URLS["billy_chuck"],
        "back_image_url": CARD_BACK_IMAGE_URLS["billy_chuck"],
        "coin_cost": 50,
        "available": True
    },
    {
        "id": "card_cliff_diver",
        "name": "Cliff Diver",
        "description": "Cliff Diver dives headfirst off amps and lands on unlucky fans, puking out beer, pizza, and whiskey often as he goes. His stage dives are as epic as his hangovers.",
        "rarity": "common",
        "front_image_url": CARD_IMAGE_URLS["cliff_diver"],
        "back_image_url": CARD_BACK_IMAGE_URLS["cliff_diver"],
        "coin_cost": 50,
        "available": False
    },
    {
        "id": "card_blood_bonder",
        "name": "Blood Bonder",
        "description": "With all the blood he spews, you'll swear Blood Bonder has thrash flowing through his veins. He showers the crowd with plasma and laughs as he bathes in the gore.",
        "rarity": "common",
        "front_image_url": CARD_IMAGE_URLS["blood_bonder"],
        "back_image_url": CARD_BACK_IMAGE_URLS["blood_bonder"],
        "coin_cost": 50,
        "available": False
    },
    # RARE ACHIEVEMENT CARDS - Not purchasable, earned by collecting cards
    {
        "id": "card_martin_van_druid",
        "name": "Martin Van Druid",
        "description": "The dark sorcerer of Assfux! Martin Van Druid conjures foul flatulent forces with his eerie cauldron. He casts gaseous spells and trumpets doom from his rear.",
        "rarity": "rare",
        "front_image_url": CARD_IMAGE_URLS["martin_van_druid"],
        "back_image_url": CARD_BACK_IMAGE_URLS["martin_van_druid"],
        "coin_cost": 0,  # Cannot be purchased
        "available": False,  # Achievement only
        "achievement_required": 10  # Unlocked at 10 cards
    },
    {
        "id": "card_tardy_donald",
        "name": "Tardy Donald",
        "description": "The drummer of Ohbitchuary who's never on time! Known for sweating beer, smelling like the night before, and delaying entire festivals by running to the taco truck.",
        "rarity": "rare",
        "front_image_url": CARD_IMAGE_URLS["tardy_donald"],
        "back_image_url": CARD_BACK_IMAGE_URLS["tardy_donald"],
        "coin_cost": 0,  # Cannot be purchased
        "available": False,  # Achievement only
        "achievement_required": 20  # Unlocked at 20 cards
    }
]

INITIAL_GOALS = [
    {
        "id": "goal_daily_login_3",
        "title": "3 Day Streak",
        "description": "Log in for 3 consecutive days",
        "goal_type": "daily_login",
        "target_value": 3,
        "reward_coins": 50,
        "reward_card_id": None
    },
    {
        "id": "goal_daily_login_7",
        "title": "Week Warrior",
        "description": "Log in for 7 consecutive days",
        "goal_type": "daily_login",
        "target_value": 7,
        "reward_coins": 150,
        "reward_card_id": "card_silly_mille"
    },
    {
        "id": "goal_profile_complete",
        "title": "Complete Profile",
        "description": "Fill out your profile bio",
        "goal_type": "profile_complete",
        "target_value": 1,
        "reward_coins": 100,
        "reward_card_id": None
    },
    {
        "id": "goal_collect_coins_500",
        "title": "Coin Collector",
        "description": "Collect 500 coins",
        "goal_type": "collect_coins",
        "target_value": 500,
        "reward_coins": 100,
        "reward_card_id": None
    },
    {
        "id": "goal_collect_cards_3",
        "title": "Card Enthusiast",
        "description": "Collect 3 different cards",
        "goal_type": "collect_cards",
        "target_value": 3,
        "reward_coins": 200,
        "reward_card_id": "card_cliff_burpin"
    },
    {
        "id": "goal_collect_all",
        "title": "Thrash Master",
        "description": "Collect all 7 Thrash Kan Kidz cards",
        "goal_type": "collect_cards",
        "target_value": 7,
        "reward_coins": 500,
        "reward_card_id": None
    }
]

# =====================
# Database Initialization
# =====================

async def seed_database():
    """Seed the database with initial cards and goals"""
    # Seed cards
    for card_data in INITIAL_CARDS:
        existing = await db.cards.find_one({"id": card_data["id"]})
        if not existing:
            card = Card(**card_data)
            await db.cards.insert_one(card.dict())
            logger.info(f"Seeded card: {card.name}")
    
    # Seed goals
    for goal_data in INITIAL_GOALS:
        existing = await db.goals.find_one({"id": goal_data["id"]})
        if not existing:
            goal = Goal(**goal_data)
            await db.goals.insert_one(goal.dict())
            logger.info(f"Seeded goal: {goal.title}")

# =====================
# Card Routes
# =====================

@api_router.get("/cards")
async def get_all_cards():
    """Get all available cards"""
    cards = await db.cards.find().to_list(100)
    return [Card(**card) for card in cards]

@api_router.get("/cards/rare")
async def get_rare_cards():
    """Get all rare achievement cards"""
    rare_cards = await db.cards.find({"rarity": "rare"}).to_list(100)
    return [Card(**rare_card) for rare_card in rare_cards]

@api_router.get("/cards/{card_id}")
async def get_card(card_id: str):
    """Get a specific card"""
    card = await db.cards.find_one({"id": card_id})
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return Card(**card)

# =====================
# User Routes
# =====================

@api_router.post("/users")
async def create_user(request: CreateUserRequest):
    """Create a new user"""
    # Check if username exists
    existing = await db.users.find_one({"username": request.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    user = User(username=request.username, coins=100)  # Start with 100 coins
    await db.users.insert_one(user.dict())
    
    # Initialize user goals
    goals = await db.goals.find().to_list(100)
    for goal in goals:
        user_goal = UserGoal(user_id=user.id, goal_id=goal["id"])
        await db.user_goals.insert_one(user_goal.dict())
    
    return user

@api_router.get("/users/{user_id}")
async def get_user(user_id: str):
    """Get user details"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)

@api_router.get("/users/username/{username}")
async def get_user_by_username(username: str):
    """Get user by username"""
    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)

@api_router.get("/users")
async def get_all_users():
    """Get all users (for trading)"""
    users = await db.users.find().to_list(100)
    return [User(**user) for user in users]

@api_router.put("/users/{user_id}/profile")
async def update_profile(user_id: str, request: UpdateProfileRequest):
    """Update user profile"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = {}
    if request.bio is not None:
        update_data["bio"] = request.bio
        if request.bio.strip():
            update_data["profile_completed"] = True
    if request.avatar_url is not None:
        update_data["avatar_url"] = request.avatar_url
    
    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})
        
        # Check profile completion goal
        if update_data.get("profile_completed"):
            await check_and_update_goals(user_id, "profile_complete", 1)
    
    updated_user = await db.users.find_one({"id": user_id})
    return User(**updated_user)

# =====================
# Daily Login & Coins
# =====================

@api_router.post("/users/{user_id}/daily-login")
async def claim_daily_login(user_id: str):
    """Claim daily login bonus"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    today = datetime.utcnow().strftime("%Y-%m-%d")
    last_login = user.get("last_login_date")
    
    if last_login == today:
        raise HTTPException(status_code=400, detail="Already claimed today")
    
    # Calculate streak
    yesterday = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
    if last_login == yesterday:
        new_streak = user.get("daily_login_streak", 0) + 1
    else:
        new_streak = 1
    
    # Calculate bonus coins (more coins for longer streaks)
    bonus_coins = min(10 + (new_streak * 5), 50)  # Max 50 coins per day
    
    new_coins = user.get("coins", 0) + bonus_coins
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "last_login_date": today,
            "daily_login_streak": new_streak,
            "coins": new_coins
        }}
    )
    
    # Check daily login goals
    await check_and_update_goals(user_id, "daily_login", new_streak)
    
    # Check coin collection goals
    await check_and_update_goals(user_id, "collect_coins", new_coins)
    
    return {
        "streak": new_streak,
        "bonus_coins": bonus_coins,
        "total_coins": new_coins,
        "message": f"Day {new_streak} streak! +{bonus_coins} coins"
    }

# =====================
# User Cards & Collection
# =====================

@api_router.get("/users/{user_id}/cards")
async def get_user_cards(user_id: str):
    """Get all cards owned by user"""
    user_cards = await db.user_cards.find({"user_id": user_id}).to_list(100)
    
    result = []
    for uc in user_cards:
        card = await db.cards.find_one({"id": uc["card_id"]})
        if card:
            result.append({
                "user_card_id": uc["id"],
                "card": Card(**card),
                "quantity": uc["quantity"],
                "acquired_at": uc["acquired_at"]
            })
    
    return result

@api_router.post("/users/{user_id}/purchase-card")
async def purchase_card(user_id: str, request: PurchaseCardRequest):
    """Purchase a card with coins"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    card = await db.cards.find_one({"id": request.card_id})
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    # Check if card is available
    if not card.get("available", True):
        raise HTTPException(status_code=400, detail="This card is not yet available")
    
    if user.get("coins", 0) < card["coin_cost"]:
        raise HTTPException(status_code=400, detail="Not enough coins")
    
    # Deduct coins
    new_coins = user.get("coins", 0) - card["coin_cost"]
    await db.users.update_one({"id": user_id}, {"$set": {"coins": new_coins}})
    
    # Add card to collection
    existing_user_card = await db.user_cards.find_one({
        "user_id": user_id,
        "card_id": request.card_id
    })
    
    if existing_user_card:
        await db.user_cards.update_one(
            {"id": existing_user_card["id"]},
            {"$inc": {"quantity": 1}}
        )
    else:
        user_card = UserCard(user_id=user_id, card_id=request.card_id)
        await db.user_cards.insert_one(user_card.dict())
    
    # Check card collection goals
    unique_cards = await db.user_cards.count_documents({"user_id": user_id})
    await check_and_update_goals(user_id, "collect_cards", unique_cards)
    
    # Check for rare card achievements
    newly_unlocked_rare = await check_rare_card_achievements(user_id)
    
    return {
        "success": True,
        "remaining_coins": new_coins,
        "card": Card(**card),
        "newly_unlocked_rare_card": newly_unlocked_rare
    }

# =====================
# Rare Card Achievement System
# =====================

async def check_rare_card_achievements(user_id: str):
    """Check if user has unlocked any rare achievement cards based on their collection size"""
    # Count total cards (including duplicates) owned by user
    user_cards = await db.user_cards.find({"user_id": user_id}).to_list(1000)
    total_cards = sum(uc.get("quantity", 1) for uc in user_cards)
    
    # Get all rare cards that require achievements
    rare_cards = await db.cards.find({"rarity": "rare", "achievement_required": {"$ne": None}}).to_list(100)
    
    newly_unlocked = None
    
    for rare_card in rare_cards:
        required_cards = rare_card.get("achievement_required", 0)
        
        if total_cards >= required_cards:
            # Check if user already has this rare card
            existing = await db.user_cards.find_one({
                "user_id": user_id,
                "card_id": rare_card["id"]
            })
            
            if not existing:
                # Award the rare card!
                user_card = UserCard(user_id=user_id, card_id=rare_card["id"])
                await db.user_cards.insert_one(user_card.dict())
                logger.info(f"User {user_id} unlocked rare card: {rare_card['name']}")
                newly_unlocked = Card(**rare_card)
    
    return newly_unlocked

@api_router.get("/users/{user_id}/check-rare-cards")
async def check_user_rare_cards(user_id: str):
    """Check and award any unlocked rare cards, return status of all rare cards"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check for newly unlocked rare cards
    newly_unlocked = await check_rare_card_achievements(user_id)
    
    # Get user's total card count
    user_cards = await db.user_cards.find({"user_id": user_id}).to_list(1000)
    total_cards = sum(uc.get("quantity", 1) for uc in user_cards)
    
    # Get all rare cards and their status for this user
    rare_cards = await db.cards.find({"rarity": "rare"}).to_list(100)
    
    rare_cards_status = []
    for rare_card in rare_cards:
        owned = await db.user_cards.find_one({
            "user_id": user_id,
            "card_id": rare_card["id"]
        })
        
        required = rare_card.get("achievement_required", 0)
        progress = min(total_cards, required) if required else 0
        
        rare_cards_status.append({
            "card": Card(**rare_card),
            "owned": owned is not None,
            "required_cards": required,
            "progress": progress,
            "can_unlock": total_cards >= required and not owned
        })
    
    return {
        "total_cards": total_cards,
        "rare_cards": rare_cards_status,
        "newly_unlocked": newly_unlocked
    }

# =====================
# Goals System
# =====================

@api_router.get("/goals")
async def get_all_goals():
    """Get all available goals"""
    goals = await db.goals.find().to_list(100)
    return [Goal(**goal) for goal in goals]

@api_router.get("/users/{user_id}/goals")
async def get_user_goals(user_id: str):
    """Get user's goal progress"""
    user_goals = await db.user_goals.find({"user_id": user_id}).to_list(100)
    
    result = []
    for ug in user_goals:
        goal = await db.goals.find_one({"id": ug["goal_id"]})
        if goal:
            result.append({
                "user_goal": UserGoal(**ug),
                "goal": Goal(**goal)
            })
    
    return result

async def check_and_update_goals(user_id: str, goal_type: str, current_value: int):
    """Check and update goals based on progress"""
    goals = await db.goals.find({"goal_type": goal_type}).to_list(100)
    
    for goal in goals:
        user_goal = await db.user_goals.find_one({
            "user_id": user_id,
            "goal_id": goal["id"]
        })
        
        if not user_goal:
            user_goal_obj = UserGoal(user_id=user_id, goal_id=goal["id"])
            await db.user_goals.insert_one(user_goal_obj.dict())
            user_goal = user_goal_obj.dict()
        
        if user_goal.get("completed"):
            continue
        
        # Update progress
        await db.user_goals.update_one(
            {"id": user_goal["id"]},
            {"$set": {"progress": current_value}}
        )
        
        # Check if goal is completed
        if current_value >= goal["target_value"]:
            await db.user_goals.update_one(
                {"id": user_goal["id"]},
                {"$set": {
                    "completed": True,
                    "completed_at": datetime.utcnow()
                }}
            )
            
            # Award rewards
            user = await db.users.find_one({"id": user_id})
            new_coins = user.get("coins", 0) + goal["reward_coins"]
            await db.users.update_one(
                {"id": user_id},
                {"$set": {"coins": new_coins}}
            )
            
            # Award card if applicable
            if goal.get("reward_card_id"):
                existing = await db.user_cards.find_one({
                    "user_id": user_id,
                    "card_id": goal["reward_card_id"]
                })
                if existing:
                    await db.user_cards.update_one(
                        {"id": existing["id"]},
                        {"$inc": {"quantity": 1}}
                    )
                else:
                    user_card = UserCard(
                        user_id=user_id,
                        card_id=goal["reward_card_id"]
                    )
                    await db.user_cards.insert_one(user_card.dict())
            
            logger.info(f"User {user_id} completed goal: {goal['title']}")

@api_router.post("/users/{user_id}/claim-goal/{goal_id}")
async def claim_goal_reward(user_id: str, goal_id: str):
    """Manually claim a goal reward (if auto-claim wasn't triggered)"""
    user_goal = await db.user_goals.find_one({
        "user_id": user_id,
        "goal_id": goal_id
    })
    
    if not user_goal:
        raise HTTPException(status_code=404, detail="Goal not found for user")
    
    goal = await db.goals.find_one({"id": goal_id})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    if user_goal.get("completed"):
        raise HTTPException(status_code=400, detail="Goal already claimed")
    
    if user_goal.get("progress", 0) < goal["target_value"]:
        raise HTTPException(status_code=400, detail="Goal not yet completed")
    
    # Mark as completed and award rewards
    await db.user_goals.update_one(
        {"id": user_goal["id"]},
        {"$set": {
            "completed": True,
            "completed_at": datetime.utcnow()
        }}
    )
    
    user = await db.users.find_one({"id": user_id})
    new_coins = user.get("coins", 0) + goal["reward_coins"]
    await db.users.update_one({"id": user_id}, {"$set": {"coins": new_coins}})
    
    card_awarded = None
    if goal.get("reward_card_id"):
        existing = await db.user_cards.find_one({
            "user_id": user_id,
            "card_id": goal["reward_card_id"]
        })
        if existing:
            await db.user_cards.update_one(
                {"id": existing["id"]},
                {"$inc": {"quantity": 1}}
            )
        else:
            user_card = UserCard(user_id=user_id, card_id=goal["reward_card_id"])
            await db.user_cards.insert_one(user_card.dict())
        
        card = await db.cards.find_one({"id": goal["reward_card_id"]})
        card_awarded = Card(**card) if card else None
    
    return {
        "success": True,
        "coins_awarded": goal["reward_coins"],
        "card_awarded": card_awarded
    }

# =====================
# Trading System
# =====================

@api_router.post("/trades")
async def create_trade(request: CreateTradeRequest):
    """Create a new trade offer"""
    # Verify both users exist
    from_user = await db.users.find_one({"id": request.from_user_id})
    to_user = await db.users.find_one({"id": request.to_user_id})
    
    if not from_user or not to_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if request.from_user_id == request.to_user_id:
        raise HTTPException(status_code=400, detail="Cannot trade with yourself")
    
    # Verify from_user owns offered cards
    for card_id in request.offered_card_ids:
        user_card = await db.user_cards.find_one({
            "user_id": request.from_user_id,
            "card_id": card_id
        })
        if not user_card or user_card.get("quantity", 0) < 1:
            raise HTTPException(status_code=400, detail=f"You don't own card {card_id}")
    
    # Verify to_user owns requested cards
    for card_id in request.requested_card_ids:
        user_card = await db.user_cards.find_one({
            "user_id": request.to_user_id,
            "card_id": card_id
        })
        if not user_card or user_card.get("quantity", 0) < 1:
            raise HTTPException(status_code=400, detail=f"Target user doesn't own card {card_id}")
    
    trade = Trade(
        from_user_id=request.from_user_id,
        to_user_id=request.to_user_id,
        offered_card_ids=request.offered_card_ids,
        requested_card_ids=request.requested_card_ids
    )
    
    await db.trades.insert_one(trade.dict())
    return trade

@api_router.get("/users/{user_id}/trades")
async def get_user_trades(user_id: str):
    """Get all trades involving a user"""
    trades = await db.trades.find({
        "$or": [
            {"from_user_id": user_id},
            {"to_user_id": user_id}
        ]
    }).to_list(100)
    
    result = []
    for trade in trades:
        from_user = await db.users.find_one({"id": trade["from_user_id"]})
        to_user = await db.users.find_one({"id": trade["to_user_id"]})
        
        offered_cards = []
        for card_id in trade["offered_card_ids"]:
            card = await db.cards.find_one({"id": card_id})
            if card:
                offered_cards.append(Card(**card))
        
        requested_cards = []
        for card_id in trade["requested_card_ids"]:
            card = await db.cards.find_one({"id": card_id})
            if card:
                requested_cards.append(Card(**card))
        
        result.append({
            "trade": Trade(**trade),
            "from_user": User(**from_user) if from_user else None,
            "to_user": User(**to_user) if to_user else None,
            "offered_cards": offered_cards,
            "requested_cards": requested_cards
        })
    
    return result

@api_router.post("/trades/{trade_id}/action")
async def trade_action(trade_id: str, request: TradeActionRequest):
    """Accept, reject, or cancel a trade"""
    trade = await db.trades.find_one({"id": trade_id})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    
    if trade["status"] != "pending":
        raise HTTPException(status_code=400, detail="Trade is no longer pending")
    
    if request.action == "cancel":
        if request.user_id != trade["from_user_id"]:
            raise HTTPException(status_code=403, detail="Only sender can cancel")
        await db.trades.update_one({"id": trade_id}, {"$set": {"status": "cancelled"}})
        return {"success": True, "message": "Trade cancelled"}
    
    if request.action == "reject":
        if request.user_id != trade["to_user_id"]:
            raise HTTPException(status_code=403, detail="Only recipient can reject")
        await db.trades.update_one({"id": trade_id}, {"$set": {"status": "rejected"}})
        return {"success": True, "message": "Trade rejected"}
    
    if request.action == "accept":
        if request.user_id != trade["to_user_id"]:
            raise HTTPException(status_code=403, detail="Only recipient can accept")
        
        # Transfer cards from sender to recipient
        for card_id in trade["offered_card_ids"]:
            # Decrease sender's quantity
            sender_card = await db.user_cards.find_one({
                "user_id": trade["from_user_id"],
                "card_id": card_id
            })
            if sender_card["quantity"] <= 1:
                await db.user_cards.delete_one({"id": sender_card["id"]})
            else:
                await db.user_cards.update_one(
                    {"id": sender_card["id"]},
                    {"$inc": {"quantity": -1}}
                )
            
            # Increase recipient's quantity
            recipient_card = await db.user_cards.find_one({
                "user_id": trade["to_user_id"],
                "card_id": card_id
            })
            if recipient_card:
                await db.user_cards.update_one(
                    {"id": recipient_card["id"]},
                    {"$inc": {"quantity": 1}}
                )
            else:
                new_card = UserCard(
                    user_id=trade["to_user_id"],
                    card_id=card_id
                )
                await db.user_cards.insert_one(new_card.dict())
        
        # Transfer cards from recipient to sender
        for card_id in trade["requested_card_ids"]:
            # Decrease recipient's quantity
            recipient_card = await db.user_cards.find_one({
                "user_id": trade["to_user_id"],
                "card_id": card_id
            })
            if recipient_card["quantity"] <= 1:
                await db.user_cards.delete_one({"id": recipient_card["id"]})
            else:
                await db.user_cards.update_one(
                    {"id": recipient_card["id"]},
                    {"$inc": {"quantity": -1}}
                )
            
            # Increase sender's quantity
            sender_card = await db.user_cards.find_one({
                "user_id": trade["from_user_id"],
                "card_id": card_id
            })
            if sender_card:
                await db.user_cards.update_one(
                    {"id": sender_card["id"]},
                    {"$inc": {"quantity": 1}}
                )
            else:
                new_card = UserCard(
                    user_id=trade["from_user_id"],
                    card_id=card_id
                )
                await db.user_cards.insert_one(new_card.dict())
        
        await db.trades.update_one({"id": trade_id}, {"$set": {"status": "accepted"}})
        return {"success": True, "message": "Trade completed!"}
    
    raise HTTPException(status_code=400, detail="Invalid action")

# =====================
# Root & Health Check
# =====================

@api_router.get("/")
async def root():
    return {"message": "Thrash Kan Kidz Card Collector API"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    await seed_database()
    logger.info("Database seeded successfully")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
