"""
Card read endpoints (catalog browsing).
Fully self-contained — no business logic, just reads from db.cards.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter()

# Reuse the same mongo connection. Both this module and server.py read/write
# the same logical database via the shared env vars.
_client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = _client[os.environ["DB_NAME"]]


class Card(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    rarity: str  # common, rare, epic, variant
    front_image_url: str
    back_image_url: str = ""
    coin_cost: int = 100
    available: bool = True
    achievement_required: Optional[int] = None
    streak_required: Optional[int] = None
    engagement_milestone: Optional[str] = None
    series: Optional[int] = None
    series_reward: Optional[int] = None
    band: Optional[str] = None
    card_type: Optional[str] = None
    is_variant: bool = False
    base_card_id: Optional[str] = None
    variant_name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


@router.get("/cards")
async def get_all_cards():
    """Get all available cards"""
    cards = await db.cards.find().to_list(500)
    return [Card(**card) for card in cards]


@router.get("/cards/rare")
async def get_rare_cards():
    """Get all rare achievement cards"""
    rare_cards = await db.cards.find({"rarity": "rare"}).to_list(100)
    return [Card(**rare_card) for rare_card in rare_cards]


@router.get("/cards/epic")
async def get_epic_cards():
    """Get all epic streak cards"""
    epic_cards = await db.cards.find({"rarity": "epic"}).to_list(100)
    return [Card(**epic_card) for epic_card in epic_cards]


@router.get("/cards/{card_id}")
async def get_card(card_id: str):
    """Get a specific card"""
    card = await db.cards.find_one({"id": card_id})
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return Card(**card)
