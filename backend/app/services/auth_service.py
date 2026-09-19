from datetime import datetime, timedelta, timezone
from bson import ObjectId

from app.database.mongodb import db

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    generate_reset_token,
    hash_reset_token,
)
from app.services.email_service import send_password_reset_email



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
    "access_token": access_token,
    "token_type": "bearer",
}


async def get_user_by_id(user_id: str):

    try:

        user = await db.users.find_one(
            {"_id": ObjectId(user_id)}
        )

    except Exception:
        return None

    return serialize_user(user)


async def request_password_reset(email: str) -> str:
    """
    Initiate a secure password reset for a registered user.
    Stores a hashed token in MongoDB and dispatches an email.
    Always returns a generic message to prevent account enumeration.
    """
    clean_email = email.strip().lower()

    user = await db.users.find_one({
        "email": {"$regex": f"^{clean_email}$", "$options": "i"}
    })

    if user:
        raw_token = generate_reset_token()
        token_hash = hash_reset_token(raw_token)

        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(minutes=15)

        # Invalidate any prior unused tokens for this user
        await db.password_reset_tokens.update_many(
            {
                "user_id": str(user["_id"]),
                "used": False,
            },
            {
                "$set": {"used": True, "invalidated_at": now}
            },
        )

        # Store hashed single-use token
        await db.password_reset_tokens.insert_one({
            "user_id": str(user["_id"]),
            "email": user["email"],
            "token_hash": token_hash,
            "created_at": now,
            "expires_at": expires_at,
            "used": False,
        })

        # Send email with raw unhashed token in link
        send_password_reset_email(user["email"], raw_token)

    return "If an account exists with that email address, a password reset link has been sent."


async def reset_password_with_token(token: str, new_password: str) -> tuple[bool, str | None]:
    """
    Validate reset token and update user's password.
    Returns (True, None) on success or (False, error_message) on failure.
    """
    if not token or not token.strip():
        return False, "Password reset token is required"

    if len(new_password) < 8:
        return False, "Password must be at least 8 characters long"

    token_hash = hash_reset_token(token.strip())

    token_doc = await db.password_reset_tokens.find_one({"token_hash": token_hash})

    if not token_doc:
        return False, "Invalid or expired password reset token"

    if token_doc.get("used"):
        return False, "This password reset token has already been used"

    now = datetime.now(timezone.utc)
    expires_at = token_doc.get("expires_at")
    if expires_at:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if now > expires_at:
            await db.password_reset_tokens.update_one(
                {"_id": token_doc["_id"]},
                {"$set": {"used": True}}
            )
            return False, "Password reset token has expired"

    # Update user's password
    user_id = token_doc.get("user_id")
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        user = None

    if not user:
        return False, "User account associated with this token was not found"

    new_password_hash = hash_password(new_password)

    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"passwordHash": new_password_hash, "updatedAt": now}}
    )

    # Invalidate token so it cannot be reused
    await db.password_reset_tokens.update_one(
        {"_id": token_doc["_id"]},
        {"$set": {"used": True, "used_at": now}}
    )

    return True, None