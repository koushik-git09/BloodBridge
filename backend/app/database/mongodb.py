from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import MONGODB_URL, DATABASE_NAME


client = AsyncIOMotorClient(MONGODB_URL, tz_aware=True)

db = client[DATABASE_NAME]