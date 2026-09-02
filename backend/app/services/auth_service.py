from datetime import datetime, timezone
from bson import ObjectId

from app.database.mongodb import db

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
)


def serialize_user(user: dict) -> dict:

    if not user:
        return None

    user["id"] = str(user["_id"])

    user.pop("_id", None)
    user.pop("passwordHash", None)

    return user


async def register_user(user_data):

    existing_user = await db.users.find_one(
        {"email": user_data.email}
    )

    if existing_user:
        return None, "Email already registered"

    user_document = {
        "name": user_data.name,
        "email": user_data.email,
        "phone": user_data.phone,
        "passwordHash": hash_password(user_data.password),
        "role": user_data.role,

        "location": {
            "latitude": user_data.location.latitude,
            "longitude": user_data.location.longitude,
            "address": user_data.location.address,
        },

        "createdAt": datetime.now(timezone.utc),
    }

    if user_data.role == "DONOR":

        if not user_data.bloodGroup:
            return None, "Blood group is required for donors"

        user_document["bloodGroup"] = user_data.bloodGroup
        user_document["availability"] = "AVAILABLE"
        user_document["lastDonation"] = None
        user_document["donationCount"] = 0
        user_document["trustScore"] = 50

    elif user_data.role == "HOSPITAL":

        if not user_data.hospitalName:
            return None, "Hospital name is required"

        user_document["hospitalName"] = user_data.hospitalName
        user_document["verified"] = True

    elif user_data.role == "BLOOD_BANK":

        user_document["inventory"] = {
            "A+": 0,
            "A-": 0,
            "B+": 0,
            "B-": 0,
            "AB+": 0,
            "AB-": 0,
            "O+": 0,
            "O-": 0,
        }

        user_document["lastInventoryUpdate"] = None
        user_document["status"] = "ACTIVE"

    result = await db.users.insert_one(user_document)

    created_user = await db.users.find_one(
        {"_id": result.inserted_id}
    )

    return serialize_user(created_user), None


async def login_user(email: str, password: str):

    user = await db.users.find_one(
        {"email": email}
    )

    if not user:
        return None

    if not verify_password(
        password,
        user["passwordHash"]
    ):
        return None

    access_token = create_access_token(
        {
            "sub": str(user["_id"]),
            "role": user["role"],
        }
    )

    return {
        "accessToken": access_token,
        "tokenType": "bearer",
    }


async def get_user_by_id(user_id: str):

    try:

        user = await db.users.find_one(
            {"_id": ObjectId(user_id)}
        )

    except Exception:
        return None

    return serialize_user(user)