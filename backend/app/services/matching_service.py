from math import radians, sin, cos, sqrt, atan2
from bson import ObjectId

from app.database.mongodb import db


def calculate_distance(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float
) -> float:
    """
    Calculate distance between two coordinates using
    the Haversine formula.

    Returns distance in kilometers.
    """

    earth_radius = 6371

    lat1 = radians(lat1)
    lon1 = radians(lon1)
    lat2 = radians(lat2)
    lon2 = radians(lon2)

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = (
        sin(dlat / 2) ** 2
        + cos(lat1)
        * cos(lat2)
        * sin(dlon / 2) ** 2
    )

    c = 2 * atan2(
        sqrt(a),
        sqrt(1 - a)
    )

    return round(
        earth_radius * c,
        2
    )


async def find_nearby_blood_banks(
    hospital_id: str,
    blood_group: str,
    max_distance_km: float = 50
):
    """
    Find active blood banks near the hospital
    and sort them by distance.
    """

    hospital = await db.users.find_one(
        {
            "_id": ObjectId(hospital_id),
            "role": "HOSPITAL"
        }
    )

    if not hospital:
        return []

    hospital_location = hospital.get("location")

    if not hospital_location:
        return []

    nearby_blood_banks = []

    cursor = db.users.find(
        {
            "role": "BLOOD_BANK",
            "status": "ACTIVE"
        }
    )

    async for blood_bank in cursor:

        location = blood_bank.get("location")

        if not location:
            continue

        distance = calculate_distance(
            hospital_location["latitude"],
            hospital_location["longitude"],
            location["latitude"],
            location["longitude"]
        )

        if distance > max_distance_km:
            continue

        available_units = blood_bank.get(
            "inventory",
            {}
        ).get(
            blood_group,
            0
        )

        nearby_blood_banks.append(
            {
                "blood_bank_id": str(
                    blood_bank["_id"]
                ),

                "name": blood_bank.get("name"),

                "distance": distance,

                "available_units": available_units,

                "phone": blood_bank.get("phone"),

                "address": location.get("address")
            }
        )

    # Nearest blood banks first
    nearby_blood_banks.sort(
        key=lambda bank: bank["distance"]
    )

    return nearby_blood_banks