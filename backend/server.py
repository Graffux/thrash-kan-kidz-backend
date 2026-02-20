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
    streak_required: Optional[int] = None  # Number of consecutive login days needed to unlock (for epic cards)
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
    total_spent_coins: int = 0  # Track total coins spent for Big Spender milestone
    monthly_logins: dict = Field(default_factory=dict)  # Track logins per month {"YYYY-MM": [day1, day2...]}
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
    "tardy_donald": "https://customer-assets.emergentagent.com/job_d1401514-883f-459a-9a0f-b23503598272/artifacts/4jtbdfkr_file_00000000bef871fdb4e76de0e490ad1a.png",
    # Epic streak cards
    "tom_angeltipper": "https://customer-assets.emergentagent.com/job_d1401514-883f-459a-9a0f-b23503598272/artifacts/ils699vw_file_00000000f3cc71fda6baa4d7c29e92a0.png",
    "tom_angelflipper": "https://customer-assets.emergentagent.com/job_d1401514-883f-459a-9a0f-b23503598272/artifacts/38vylb1j_file_00000000617471fd90c3846604962dda.png",
    # Coming Soon cards (Wave 2)
    "don_doody": "https://customer-assets.emergentagent.com/job_d1401514-883f-459a-9a0f-b23503598272/artifacts/gha4gfuz_enhanced-1771278042580.jpg",
    "billy_mylanta": "https://customer-assets.emergentagent.com/job_d1401514-883f-459a-9a0f-b23503598272/artifacts/xkucxxap_enhanced-1771278196496.jpg",
    "tommy_spewart": "https://customer-assets.emergentagent.com/job_d1401514-883f-459a-9a0f-b23503598272/artifacts/r8qvr3ex_enhanced-1771278293743.jpg",
    "piggy_in_a_blanket": "https://customer-assets.emergentagent.com/job_0530a193-d676-41a8-b42a-392a1e7e6662/artifacts/w8mjufnl_enhanced-1771278196496.jpg",
    "beer_schmier": "https://customer-assets.emergentagent.com/job_d1401514-883f-459a-9a0f-b23503598272/artifacts/o7ytl1mj_enhanced-1771279108828.jpg",
    # New Rare achievement cards (30 and 40 cards)
    "kerry_the_king": "https://customer-assets.emergentagent.com/job_0530a193-d676-41a8-b42a-392a1e7e6662/artifacts/8sfdw92q_file_000000001f5071fd88973aa9c05bebac.png",
    "jeff_possess_ya": "https://customer-assets.emergentagent.com/job_0530a193-d676-41a8-b42a-392a1e7e6662/artifacts/s0jimvhs_file_000000006fcc71fd80e12f47bd0524f3.png",
    # Coming Soon Wave 3
    "philled_up": "https://customer-assets.emergentagent.com/job_0530a193-d676-41a8-b42a-392a1e7e6662/artifacts/i3cgqtwz_enhanced-1771278999569.jpg",
    # Engagement Milestone Cards
    "maxi_pad": "https://customer-assets.emergentagent.com/job_0530a193-d676-41a8-b42a-392a1e7e6662/artifacts/i3cgqtwz_enhanced-1771278999569.jpg",
    "musty_dave": "https://customer-assets.emergentagent.com/job_0530a193-d676-41a8-b42a-392a1e7e6662/artifacts/i3cgqtwz_enhanced-1771278999569.jpg",
    "chum_araya": "https://customer-assets.emergentagent.com/job_0530a193-d676-41a8-b42a-392a1e7e6662/artifacts/i3cgqtwz_enhanced-1771278999569.jpg"
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
    "tardy_donald": "https://customer-assets.emergentagent.com/job_d1401514-883f-459a-9a0f-b23503598272/artifacts/aiui1nef_file_000000009e4871f8b270fdb6a2aa38de.png",
    # Epic streak cards backs
    "tom_angeltipper": "https://customer-assets.emergentagent.com/job_d1401514-883f-459a-9a0f-b23503598272/artifacts/g775jo99_file_000000002c3871fda4d75a8c5b504ef3.png",
    "tom_angelflipper": "https://customer-assets.emergentagent.com/job_d1401514-883f-459a-9a0f-b23503598272/artifacts/vc9gdgee_file_0000000089a071f8a6fe8ea7b7eefa41.png",
    # Coming Soon cards backs (use front as placeholder for now)
    "don_doody": "https://customer-assets.emergentagent.com/job_d1401514-883f-459a-9a0f-b23503598272/artifacts/gha4gfuz_enhanced-1771278042580.jpg",
    "billy_mylanta": "https://customer-assets.emergentagent.com/job_d1401514-883f-459a-9a0f-b23503598272/artifacts/xkucxxap_enhanced-1771278196496.jpg",
    "tommy_spewart": "https://customer-assets.emergentagent.com/job_d1401514-883f-459a-9a0f-b23503598272/artifacts/r8qvr3ex_enhanced-1771278293743.jpg",
    "piggy_in_a_blanket": "https://customer-assets.emergentagent.com/job_0530a193-d676-41a8-b42a-392a1e7e6662/artifacts/f5c5jnwj_enhanced-1771279398630.jpg",
    "beer_schmier": "https://customer-assets.emergentagent.com/job_d1401514-883f-459a-9a0f-b23503598272/artifacts/o7ytl1mj_enhanced-1771279108828.jpg",
    # New Rare achievement cards backs (30 and 40 cards)
    "kerry_the_king": "https://customer-assets.emergentagent.com/job_0530a193-d676-41a8-b42a-392a1e7e6662/artifacts/sxac7kjw_file_00000000833071fd8adc51da518e9550.png",
    "jeff_possess_ya": "https://customer-assets.emergentagent.com/job_0530a193-d676-41a8-b42a-392a1e7e6662/artifacts/hzkwnsri_file_00000000564871fd915c1ecfbac3aacc.png",
    # Coming Soon Wave 3 backs
    "philled_up": "https://customer-assets.emergentagent.com/job_0530a193-d676-41a8-b42a-392a1e7e6662/artifacts/pru66o9k_enhanced-1771280383938.jpg",
    # Engagement Milestone Cards backs
    "maxi_pad": "https://customer-assets.emergentagent.com/job_0530a193-d676-41a8-b42a-392a1e7e6662/artifacts/pru66o9k_enhanced-1771280383938.jpg",
    "musty_dave": "https://customer-assets.emergentagent.com/job_0530a193-d676-41a8-b42a-392a1e7e6662/artifacts/pru66o9k_enhanced-1771280383938.jpg",
    "chum_araya": "https://customer-assets.emergentagent.com/job_0530a193-d676-41a8-b42a-392a1e7e6662/artifacts/pru66o9k_enhanced-1771280383938.jpg"
}

# Rare card achievement requirements
RARE_CARD_ACHIEVEMENTS = {
    "card_martin_van_druid": {"required_cards": 10, "name": "Martin Van Druid"},
    "card_tardy_donald": {"required_cards": 20, "name": "Tardy Donald"},
    "card_kerry_the_king": {"required_cards": 30, "name": "Kerry The King"},
    "card_jeff_possess_ya": {"required_cards": 40, "name": "Jeff Possess Ya"}
}

# Engagement Milestone requirements for unlocking Coming Soon cards
ENGAGEMENT_MILESTONES = {
    "card_maxi_pad": {
        "name": "Maxi Pad",
        "type": "dedicated_fan",
        "requirement": 30,  # 30-day login streak
        "description": "Dedicated Fan: 30-day login streak"
    },
    "card_musty_dave": {
        "name": "Musty Dave",
        "type": "big_spender",
        "requirement": 750,  # 750 coins spent
        "description": "Big Spender: Spend 750 total coins"
    },
    "card_chum_araya": {
        "name": "Chum Araya",
        "type": "monthly_master",
        "requirement": 20,  # 20 days in a single month
        "description": "Monthly Master: Log in 20 days in a single month"
    }
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
        "available": True
    },
    {
        "id": "card_blood_bonder",
        "name": "Blood Bonder",
        "description": "With all the blood he spews, you'll swear Blood Bonder has thrash flowing through his veins. He showers the crowd with plasma and laughs as he bathes in the gore.",
        "rarity": "common",
        "front_image_url": CARD_IMAGE_URLS["blood_bonder"],
        "back_image_url": CARD_BACK_IMAGE_URLS["blood_bonder"],
        "coin_cost": 50,
        "available": True
    },
    # WAVE 2 CARDS (Now Available!)
    {
        "id": "card_don_doody",
        "name": "Don Doody",
        "description": "From Shit Slayer! Don Doody brings the brown note to every show. His bass drops are legendary, and so is the smell. You've been warned!",
        "rarity": "common",
        "front_image_url": CARD_IMAGE_URLS["don_doody"],
        "back_image_url": CARD_BACK_IMAGE_URLS["don_doody"],
        "coin_cost": 50,
        "available": True
    },
    {
        "id": "card_tommy_spewart",
        "name": "Tommy Spewart",
        "description": "The legendary vomit virtuoso! Tommy Spewart hurls with precision and rhythm. His rainbow projections have become his signature move!",
        "rarity": "common",
        "front_image_url": CARD_IMAGE_URLS["tommy_spewart"],
        "back_image_url": CARD_BACK_IMAGE_URLS["tommy_spewart"],
        "coin_cost": 50,
        "available": True
    },
    {
        "id": "card_beer_schmier",
        "name": "Beer Schmier",
        "description": "The foam-spewing legend! Beer Schmier drowns crowds in golden showers of brew. His performances are 50% music, 50% alcohol poisoning!",
        "rarity": "common",
        "front_image_url": CARD_IMAGE_URLS["beer_schmier"],
        "back_image_url": CARD_BACK_IMAGE_URLS["beer_schmier"],
        "coin_cost": 50,
        "available": True
    },
    # COMING SOON WAVE 3
    {
        "id": "card_philled_up",
        "name": "Philled Up",
        "description": "From Sacrud Ryche! Phil never met a cheese pizza he didn't love, or finish. If a dinner is all-you-can-eat, he treats it like an Olympic sport. No matter who he opens for, he always closes down the buffet!",
        "rarity": "common",
        "front_image_url": CARD_IMAGE_URLS["philled_up"],
        "back_image_url": CARD_BACK_IMAGE_URLS["philled_up"],
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
        "coin_cost": 75,  # Value: 75 coins
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
        "coin_cost": 75,  # Value: 75 coins
        "available": False,  # Achievement only
        "achievement_required": 20  # Unlocked at 20 cards
    },
    {
        "id": "card_kerry_the_king",
        "name": "Kerry The King",
        "description": "Kerry the King rules the stage with a monstrous ego and an even more monstrous scowl. He makes Slash look like Fred Rogers when he thrashes out blistering solos while glaring daggers into the crowd.",
        "rarity": "rare",
        "front_image_url": CARD_IMAGE_URLS["kerry_the_king"],
        "back_image_url": CARD_BACK_IMAGE_URLS["kerry_the_king"],
        "coin_cost": 75,  # Value: 75 coins
        "available": False,  # Achievement only
        "achievement_required": 30  # Unlocked at 30 cards
    },
    {
        "id": "card_jeff_possess_ya",
        "name": "Jeff Possess Ya",
        "description": "Jeff Becerra's brand of possession is a full-body experience. Your head grows horns and your soul is doomed. From the band Pussessed!",
        "rarity": "rare",
        "front_image_url": CARD_IMAGE_URLS["jeff_possess_ya"],
        "back_image_url": CARD_BACK_IMAGE_URLS["jeff_possess_ya"],
        "coin_cost": 75,  # Value: 75 coins
        "available": False,  # Achievement only
        "achievement_required": 40  # Unlocked at 40 cards
    },
    # EPIC STREAK CARDS - Unlocked by consecutive login days
    {
        "id": "card_tom_angeltipper",
        "name": "Tom Angeltipper",
        "description": "From the band Sodum! Once a month, Tom Angeltipper drinks ten shots of Schnapps and tosses ten angels off clouds. Why do angels fall? Because they're easily led!...OFF LEDGES!",
        "rarity": "epic",
        "front_image_url": CARD_IMAGE_URLS["tom_angeltipper"],
        "back_image_url": CARD_BACK_IMAGE_URLS["tom_angeltipper"],
        "coin_cost": 100,  # Value: 100 coins
        "available": False,  # Streak reward only
        "streak_required": 7  # Unlocked at 7 day streak
    },
    {
        "id": "card_tom_angelflipper",
        "name": "Tom Angelflipper",
        "description": "From the band Sodumb! He's the reason angels had to sign a health waiver. Once a month he flips angels upside down while chugging beer. The ultimate thrash legend!",
        "rarity": "epic",
        "front_image_url": CARD_IMAGE_URLS["tom_angelflipper"],
        "back_image_url": CARD_BACK_IMAGE_URLS["tom_angelflipper"],
        "coin_cost": 100,  # Value: 100 coins
        "available": False,  # Streak reward only
        "streak_required": 14  # Unlocked at 14 day streak
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
        "description": "Collect a card from all 3 rarities (Common, Rare, Epic)",
        "goal_type": "collect_all_rarities",
        "target_value": 3,
        "reward_coins": 150,
        "reward_card_id": None
    },
    {
        "id": "goal_collect_all",
        "title": "Thrash Master",
        "description": "Collect 50 cards total",
        "goal_type": "collect_cards",
        "target_value": 50,
        "reward_coins": 250,
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
        else:
            # Update existing cards with new fields
            update_fields = {}
            if card_data.get("achievement_required") is not None:
                update_fields["achievement_required"] = card_data["achievement_required"]
            if card_data.get("rarity") != existing.get("rarity"):
                update_fields["rarity"] = card_data["rarity"]
            if card_data.get("streak_required") is not None:
                update_fields["streak_required"] = card_data["streak_required"]
            # Update availability status
            if card_data.get("available") != existing.get("available"):
                update_fields["available"] = card_data["available"]
            # Update coin_cost if changed
            if card_data.get("coin_cost") != existing.get("coin_cost"):
                update_fields["coin_cost"] = card_data["coin_cost"]
            if update_fields:
                await db.cards.update_one({"id": card_data["id"]}, {"$set": update_fields})
                logger.info(f"Updated card: {card_data['name']} with {update_fields}")
    
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

@api_router.get("/cards/epic")
async def get_epic_cards():
    """Get all epic streak cards"""
    epic_cards = await db.cards.find({"rarity": "epic"}).to_list(100)
    return [Card(**epic_card) for epic_card in epic_cards]

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
    
    # Check for newly unlocked epic cards (notify user they can now purchase)
    newly_unlocked_epic = await check_epic_streak_unlocks(user_id, new_streak)
    
    return {
        "streak": new_streak,
        "bonus_coins": bonus_coins,
        "total_coins": new_coins,
        "message": f"Day {new_streak} streak! +{bonus_coins} coins",
        "newly_unlocked_epic_card": newly_unlocked_epic
    }

# =====================
# Epic Streak Card Achievement System
# =====================

async def check_epic_streak_unlocks(user_id: str, current_streak: int):
    """Check if user has unlocked any epic cards for purchase based on their login streak"""
    # Get user's unlocked achievements
    user = await db.users.find_one({"id": user_id})
    unlocked_epics = user.get("unlocked_epic_cards", [])
    
    # Get all epic cards that require streak achievements
    epic_cards = await db.cards.find({"rarity": "epic", "streak_required": {"$ne": None}}).to_list(100)
    
    newly_unlocked = None
    
    for epic_card in epic_cards:
        required_streak = epic_card.get("streak_required", 0)
        
        if current_streak >= required_streak and epic_card["id"] not in unlocked_epics:
            # Mark as unlocked (purchasable) - don't auto-award
            await db.users.update_one(
                {"id": user_id},
                {"$addToSet": {"unlocked_epic_cards": epic_card["id"]}}
            )
            logger.info(f"User {user_id} unlocked epic card for purchase: {epic_card['name']} (streak: {current_streak})")
            newly_unlocked = Card(**epic_card)
    
    return newly_unlocked

@api_router.get("/users/{user_id}/check-epic-cards")
async def check_user_epic_cards(user_id: str):
    """Check status of all epic streak cards for a user"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    current_streak = user.get("daily_login_streak", 0)
    unlocked_epics = user.get("unlocked_epic_cards", [])
    
    # Get all epic cards and their status for this user
    epic_cards = await db.cards.find({"rarity": "epic"}).to_list(100)
    
    epic_cards_status = []
    for epic_card in epic_cards:
        owned = await db.user_cards.find_one({
            "user_id": user_id,
            "card_id": epic_card["id"]
        })
        
        required = epic_card.get("streak_required", 0)
        progress = min(current_streak, required) if required else 0
        is_unlocked = epic_card["id"] in unlocked_epics or current_streak >= required
        
        # Auto-unlock if streak requirement met
        if current_streak >= required and epic_card["id"] not in unlocked_epics:
            await db.users.update_one(
                {"id": user_id},
                {"$addToSet": {"unlocked_epic_cards": epic_card["id"]}}
            )
            is_unlocked = True
        
        epic_cards_status.append({
            "card": Card(**epic_card),
            "owned": owned is not None,
            "unlocked": is_unlocked,  # Can purchase
            "required_streak": required,
            "progress": progress,
            "can_purchase": is_unlocked and not owned
        })
    
    return {
        "current_streak": current_streak,
        "epic_cards": epic_cards_status
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
    
    # Check if card is available for purchase
    card_available = card.get("available", True)
    card_rarity = card.get("rarity", "common")
    
    # For rare/epic cards, check if user has unlocked them
    if not card_available:
        if card_rarity == "rare":
            # Check if user has unlocked this rare card
            unlocked_rares = user.get("unlocked_rare_cards", [])
            if card["id"] not in unlocked_rares:
                # Check if they should have it unlocked based on card count
                user_cards = await db.user_cards.find({"user_id": user_id}).to_list(1000)
                total_cards = sum(uc.get("quantity", 1) for uc in user_cards)
                required = card.get("achievement_required", 0)
                if total_cards < required:
                    raise HTTPException(status_code=400, detail=f"Collect {required} cards to unlock this rare card")
        elif card_rarity == "epic":
            # Check if user has unlocked this epic card
            unlocked_epics = user.get("unlocked_epic_cards", [])
            if card["id"] not in unlocked_epics:
                # Check if they should have it unlocked based on streak
                current_streak = user.get("daily_login_streak", 0)
                required = card.get("streak_required", 0)
                if current_streak < required:
                    raise HTTPException(status_code=400, detail=f"Reach a {required}-day login streak to unlock this epic card")
        else:
            # Coming soon cards - not purchasable
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
    
    # Check all-rarities goal (collect one of each: common, rare, epic)
    await check_all_rarities_goal(user_id)
    
    # Check for rare card achievements
    newly_unlocked_rare = await check_rare_card_achievements(user_id)
    
    # Check for milestone rewards (free card every 5 cards)
    milestone_reward = await check_milestone_reward(user_id)
    
    return {
        "success": True,
        "remaining_coins": new_coins,
        "card": Card(**card),
        "newly_unlocked_rare_card": newly_unlocked_rare,
        "milestone_reward": milestone_reward
    }

# =====================
# Milestone Reward System
# =====================

async def check_milestone_reward(user_id: str):
    """Award a free common card every 10 cards collected"""
    # Get user's total cards (including duplicates)
    user_cards = await db.user_cards.find({"user_id": user_id}).to_list(1000)
    total_cards = sum(uc.get("quantity", 1) for uc in user_cards)
    
    # Get user's milestone tracking (how many milestones have been claimed)
    user = await db.users.find_one({"id": user_id})
    milestones_claimed = user.get("milestones_claimed", 0)
    
    # Calculate how many milestones user should have based on total cards
    milestones_earned = total_cards // 10
    
    # If user has earned a new milestone they haven't claimed yet
    if milestones_earned > milestones_claimed:
        # Get all available common cards
        common_cards = await db.cards.find({
            "rarity": "common", 
            "available": True
        }).to_list(100)
        
        if common_cards:
            import random
            # Pick a random common card
            reward_card = random.choice(common_cards)
            
            # Add card to user's collection
            existing_user_card = await db.user_cards.find_one({
                "user_id": user_id,
                "card_id": reward_card["id"]
            })
            
            if existing_user_card:
                await db.user_cards.update_one(
                    {"_id": existing_user_card["_id"]},
                    {"$inc": {"quantity": 1}}
                )
            else:
                user_card = UserCard(user_id=user_id, card_id=reward_card["id"])
                await db.user_cards.insert_one(user_card.dict())
            
            # Update user's milestone count
            await db.users.update_one(
                {"id": user_id},
                {"$set": {"milestones_claimed": milestones_claimed + 1}}
            )
            
            logger.info(f"User {user_id} received milestone reward: {reward_card['name']} (milestone {milestones_claimed + 1})")
            
            return {
                "milestone_number": milestones_claimed + 1,
                "card": Card(**reward_card),
                "next_milestone_at": (milestones_claimed + 2) * 10
            }
    
    return None

# =====================
# Rare Card Achievement System
# =====================

async def check_rare_card_achievements(user_id: str):
    """Check if user has unlocked any rare achievement cards for purchase based on their collection size"""
    # Count total cards (including duplicates) owned by user
    user_cards = await db.user_cards.find({"user_id": user_id}).to_list(1000)
    total_cards = sum(uc.get("quantity", 1) for uc in user_cards)
    
    # Get user's unlocked rare cards
    user = await db.users.find_one({"id": user_id})
    unlocked_rares = user.get("unlocked_rare_cards", [])
    
    # Get all rare cards that require achievements
    rare_cards = await db.cards.find({"rarity": "rare", "achievement_required": {"$ne": None}}).to_list(100)
    
    newly_unlocked = None
    
    for rare_card in rare_cards:
        required_cards = rare_card.get("achievement_required", 0)
        
        if total_cards >= required_cards and rare_card["id"] not in unlocked_rares:
            # Mark as unlocked (purchasable) - don't auto-award
            await db.users.update_one(
                {"id": user_id},
                {"$addToSet": {"unlocked_rare_cards": rare_card["id"]}}
            )
            logger.info(f"User {user_id} unlocked rare card for purchase: {rare_card['name']}")
            newly_unlocked = Card(**rare_card)
    
    return newly_unlocked

@api_router.get("/users/{user_id}/check-rare-cards")
async def check_user_rare_cards(user_id: str):
    """Check status of all rare cards for a user"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user's total card count
    user_cards = await db.user_cards.find({"user_id": user_id}).to_list(1000)
    total_cards = sum(uc.get("quantity", 1) for uc in user_cards)
    
    unlocked_rares = user.get("unlocked_rare_cards", [])
    
    # Get all rare cards and their status for this user
    rare_cards = await db.cards.find({"rarity": "rare"}).to_list(100)
    
    rare_cards_status = []
    newly_unlocked = None
    
    for rare_card in rare_cards:
        owned = await db.user_cards.find_one({
            "user_id": user_id,
            "card_id": rare_card["id"]
        })
        
        required = rare_card.get("achievement_required", 0)
        progress = min(total_cards, required) if required else 0
        is_unlocked = rare_card["id"] in unlocked_rares or total_cards >= required
        
        # Auto-unlock if achievement requirement met
        if total_cards >= required and rare_card["id"] not in unlocked_rares:
            await db.users.update_one(
                {"id": user_id},
                {"$addToSet": {"unlocked_rare_cards": rare_card["id"]}}
            )
            is_unlocked = True
            if not owned:
                newly_unlocked = Card(**rare_card)
        
        rare_cards_status.append({
            "card": Card(**rare_card),
            "owned": owned is not None,
            "unlocked": is_unlocked,  # Can purchase
            "required_cards": required,
            "progress": progress,
            "can_purchase": is_unlocked and not owned
        })
    
    # Calculate milestone info
    milestones_claimed = user.get("milestones_claimed", 0)
    next_milestone_at = (milestones_claimed + 1) * 10
    cards_to_next_milestone = max(0, next_milestone_at - total_cards)
    
    return {
        "total_cards": total_cards,
        "rare_cards": rare_cards_status,
        "newly_unlocked": newly_unlocked,
        "milestone_info": {
            "milestones_claimed": milestones_claimed,
            "next_milestone_at": next_milestone_at,
            "cards_to_next_milestone": cards_to_next_milestone,
            "progress_to_next": total_cards % 5
        }
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

async def check_all_rarities_goal(user_id: str):
    """Check if user has collected at least one card from each rarity (common, rare, epic)"""
    # Get the goal
    goal = await db.goals.find_one({"goal_type": "collect_all_rarities"})
    if not goal:
        return
    
    # Get user's goal progress
    user_goal = await db.user_goals.find_one({
        "user_id": user_id,
        "goal_id": goal["id"]
    })
    
    if not user_goal:
        user_goal_obj = UserGoal(user_id=user_id, goal_id=goal["id"])
        await db.user_goals.insert_one(user_goal_obj.dict())
        user_goal = user_goal_obj.dict()
    
    if user_goal.get("completed"):
        return
    
    # Get user's cards with their rarities
    user_cards = await db.user_cards.find({"user_id": user_id}).to_list(1000)
    rarities_collected = set()
    
    for uc in user_cards:
        card = await db.cards.find_one({"id": uc["card_id"]})
        if card:
            rarities_collected.add(card.get("rarity"))
    
    # Count how many of the 3 rarities they have
    required_rarities = {"common", "rare", "epic"}
    collected_count = len(rarities_collected.intersection(required_rarities))
    
    # Update progress
    await db.user_goals.update_one(
        {"id": user_goal["id"]},
        {"$set": {"progress": collected_count}}
    )
    
    # Check if completed (has all 3 rarities)
    if collected_count >= 3:
        await db.user_goals.update_one(
            {"id": user_goal["id"]},
            {"$set": {
                "completed": True,
                "completed_at": datetime.utcnow()
            }}
        )
        
        # Award coins
        user = await db.users.find_one({"id": user_id})
        new_coins = user.get("coins", 0) + goal["reward_coins"]
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"coins": new_coins}}
        )
        logging.info(f"User {user_id} completed Card Enthusiast goal! +{goal['reward_coins']} coins")

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
