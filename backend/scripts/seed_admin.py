import asyncio
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# Add backend directory to sys.path so app imports resolve
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.database.mongodb import db
from app.core.security import hash_password

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "bloodbridgeadmin@gmail.com").strip().lower()
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "12345678")


async def seed_admin():
    print("Checking admin account existence in database...")

    existing_admin = await db.users.find_one({"email": ADMIN_EMAIL})

    if existing_admin:
        print(f"Admin account ({ADMIN_EMAIL}) already exists. Seed skipped.")
        return

    # Securely hash password using existing bcrypt implementation
    hashed_pwd = hash_password(ADMIN_PASSWORD)

    admin_document = {
        "name": "BloodBridge Administrator",
        "email": ADMIN_EMAIL,
        "phone": "+1000000000",
        "role": "ADMIN",
        "passwordHash": hashed_pwd,
        "location": {
            "latitude": 0.0,
            "longitude": 0.0,
            "address": "Administrative Headquarters",
        },
        "createdAt": datetime.now(timezone.utc),
    }

    result = await db.users.insert_one(admin_document)
    print(f"Admin account created successfully with ID: {result.inserted_id}")
    print("Password stored as secure bcrypt hash. Plaintext password was not stored.")


if __name__ == "__main__":
    asyncio.run(seed_admin())
