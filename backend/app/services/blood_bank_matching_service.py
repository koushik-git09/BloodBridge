from math import radians, sin, cos, sqrt, atan2
from datetime import datetime, timezone

from app.database.mongodb import db


BLOOD_GROUPS = [
    "A+",
    "A-",
    "B+",
    "B-",
    "AB+",
    "AB-",
    "O+",
    "O-",
]


# ---------------------------------------------------------
# BLOOD GROUP COMPATIBILITY
# ---------------------------------------------------------

BLOOD_COMPATIBILITY = {
    "A+": ["A+", "A-"],
    "A-": ["A-"],
    "B+": ["B+", "B-"],
    "B-": ["B-"],
    "AB+": [
        "A+",
        "A-",
        "B+",
        "B-",
        "AB+",
        "AB-",
        "O+",
        "O-",
    ],
    "AB-": [
        "A-",
        "B-",
        "AB-",
        "O-",
    ],
    "O+": ["O+", "O-"],
    "O-": ["O-"],
}


# ---------------------------------------------------------
# DISTANCE CALCULATION
# ---------------------------------------------------------

def calculate_distance_km(
    latitude_1: float,
    longitude_1: float,
    latitude_2: float,
    longitude_2: float,
) -> float:
    """
    Calculate approximate distance between two coordinates
    using the Haversine formula.
    """

    earth_radius_km = 6371.0

    lat1 = radians(latitude_1)
    lon1 = radians(longitude_1)

    lat2 = radians(latitude_2)
    lon2 = radians(longitude_2)

    delta_lat = lat2 - lat1
    delta_lon = lon2 - lon1

    a = (
        sin(delta_lat / 2) ** 2
        + cos(lat1)
        * cos(lat2)
        * sin(delta_lon / 2) ** 2
    )

    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    return round(earth_radius_km * c, 2)


# ---------------------------------------------------------
# CHECK BLOOD COMPATIBILITY
# ---------------------------------------------------------

def is_blood_compatible(
    requested_group: str,
    available_group: str,
) -> bool:
    """
    Returns True when blood from available_group can be
    used for a request for requested_group.
    """

    compatible_groups = BLOOD_COMPATIBILITY.get(
        requested_group,
        [],
    )

    return available_group in compatible_groups


# ---------------------------------------------------------
# FIND MATCHING BLOOD BANKS
# ---------------------------------------------------------

async def find_matching_blood_banks(
    blood_group: str,
    units_required: int,
    hospital_location: dict,
):
    """
    Find active blood banks that have compatible blood.

    Results are ranked by:
        1. Distance
        2. Available units
    """

    hospital_latitude = hospital_location["latitude"]
    hospital_longitude = hospital_location["longitude"]

    compatible_groups = BLOOD_COMPATIBILITY.get(
        blood_group,
        [],
    )

    if not compatible_groups:
        return []

    matching_banks = []

    cursor = db.users.find({
        "role": "BLOOD_BANK",
        "status": "ACTIVE",
    })

    async for blood_bank in cursor:

        location = blood_bank.get("location")

        if not location:
            continue

        inventory = blood_bank.get(
            "inventory",
            {},
        )

        # -------------------------------------------------
        # Calculate total compatible inventory
        # -------------------------------------------------

        compatible_units = 0

        for group in compatible_groups:
            compatible_units += int(
                inventory.get(group, 0)
            )

        if compatible_units <= 0:
            continue

        # -------------------------------------------------
        # Calculate distance
        # -------------------------------------------------

        distance = calculate_distance_km(
            hospital_latitude,
            hospital_longitude,
            location["latitude"],
            location["longitude"],
        )

        matching_banks.append({
            "blood_bank_id": str(
                blood_bank["_id"]
            ),
            "name": blood_bank.get(
                "name",
                "Blood Bank",
            ),
            "blood_group": blood_group,
            "compatible_groups": compatible_groups,
            "available_units": compatible_units,
            "distance": distance,
            "location": location,
        })

    # -----------------------------------------------------
    # Rank nearest first
    # -----------------------------------------------------

    matching_banks.sort(
        key=lambda bank: (
            bank["distance"],
            -bank["available_units"],
        )
    )

    return matching_banks


# ---------------------------------------------------------
# CREATE RESERVATIONS
# ---------------------------------------------------------

async def create_blood_bank_reservations(
    request_id: str,
    hospital_id: str,
    blood_group: str,
    units_required: int,
    hospital_location: dict,
):
    """
    Find suitable blood banks and create reservations
    until the requested units are covered.
    """

    matching_banks = await find_matching_blood_banks(
        blood_group=blood_group,
        units_required=units_required,
        hospital_location=hospital_location,
    )

    if not matching_banks:
        return []

    remaining_units = units_required
    created_reservations = []

    for bank in matching_banks:

        if remaining_units <= 0:
            break

        existing_reservation = await db.blood_bank_reservations.find_one({
            "request_id": request_id,
            "blood_bank_id": bank["blood_bank_id"],
        })

        if existing_reservation:
            continue

        units_to_request = min(
            remaining_units,
            bank["available_units"],
        )

        if units_to_request <= 0:
            continue

        reservation_document = {
            "request_id": request_id,
            "blood_bank_id": bank["blood_bank_id"],
            "hospital_id": hospital_id,
            "blood_group": blood_group,
            "units_requested": units_to_request,
            "units_confirmed": 0,
            "status": "PENDING",
            "distance": bank["distance"],
            "created_at": datetime.now(timezone.utc),
            "responded_at": None,
        }

        result = await db.blood_bank_reservations.insert_one(
            reservation_document
        )

        reservation_document["_id"] = result.inserted_id

        created_reservations.append(
            reservation_document
        )

        remaining_units -= units_to_request

    return created_reservations