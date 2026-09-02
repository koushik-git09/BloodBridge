from datetime import datetime, timezone
from app.database.mongodb import db
from app.services.matching_service import find_nearby_blood_banks


async def create_blood_bank_reservations(
    request_id: str,
    hospital_id: str,
    blood_group: str,
    units_required: int
):
    """
    Find nearby blood banks and create reservation
    requests for blood banks that have the required
    blood group available.
    """

    nearby_blood_banks = await find_nearby_blood_banks(
        hospital_id=hospital_id,
        blood_group=blood_group
    )

    reservations = []

    for blood_bank in nearby_blood_banks:

        # Skip blood banks with no available units
        if blood_bank["available_units"] <= 0:
            continue

        reservation_data = {
            "request_id": request_id,
            "blood_bank_id": blood_bank["blood_bank_id"],
            "hospital_id": hospital_id,
            "blood_group": blood_group,
            "units_requested": units_required,
            "units_confirmed": 0,
            "status": "PENDING",
            "distance": blood_bank["distance"],
            "created_at": datetime.now(timezone.utc),
            "responded_at": None
        }

        result = await db.blood_bank_reservations.insert_one(
            reservation_data
        )

        reservation_data["id"] = str(result.inserted_id)
        reservation_data.pop("_id", None)

        reservations.append(reservation_data)

    return reservations