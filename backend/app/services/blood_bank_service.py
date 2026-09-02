from datetime import datetime, timezone

from app.database.mongodb import db


BLOOD_GROUPS = [
    "A+", "A-",
    "B+", "B-",
    "AB+", "AB-",
    "O+", "O-"
]


def serialize_blood_bank(blood_bank: dict) -> dict:

    return {
        "blood_bank_id": str(blood_bank["_id"]),
        "name": blood_bank.get("name"),

        "inventory": blood_bank.get("inventory", {}),

        "last_inventory_update": blood_bank.get(
            "lastInventoryUpdate"
        ),

        "status": blood_bank.get(
            "status",
            "ACTIVE"
        ),
    }


async def get_my_inventory(blood_bank_id: str):

    from bson import ObjectId

    try:
        blood_bank = await db.users.find_one(
            {
                "_id": ObjectId(blood_bank_id),
                "role": "BLOOD_BANK"
            }
        )

    except Exception:
        return None

    if not blood_bank:
        return None

    return serialize_blood_bank(blood_bank)


async def update_inventory(
    blood_bank_id: str,
    inventory_data
):

    from bson import ObjectId

    # Ensure all 8 blood groups exist
    inventory = {
        group: inventory_data.inventory.get(group, 0)
        for group in BLOOD_GROUPS
    }

    result = await db.users.update_one(
        {
            "_id": ObjectId(blood_bank_id),
            "role": "BLOOD_BANK"
        },
        {
            "$set": {
                "inventory": inventory,

                "lastInventoryUpdate":
                    datetime.now(timezone.utc),

                "updatedAt":
                    datetime.now(timezone.utc),
            }
        }
    )

    if result.matched_count == 0:
        return None

    return await get_my_inventory(
        blood_bank_id
    )