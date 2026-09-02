from datetime import datetime, timezone
from bson import ObjectId

from app.database.mongodb import db
from app.services.reservation_service import (
    create_blood_bank_reservations,
)

def serialize_request(request: dict) -> dict:
    """Convert MongoDB document into API-friendly format."""

    return {
        "id": str(request["_id"]),
        "hospital_id": str(request["hospital_id"]),
        "hospital_name": request.get("hospital_name"),

        "patient_reference": request["patient_reference"],
        "blood_group": request["blood_group"],
        "units_required": request["units_required"],
        "urgency": request["urgency"],

        "status": request["status"],

        "blood_bank_units": request.get("blood_bank_units", 0),
        "donor_units": request.get("donor_units", 0),

        "remaining_units": request.get(
            "remaining_units",
            request["units_required"]
        ),

        "notes": request.get("notes"),

        "created_at": request["created_at"],
    }


async def create_blood_request(
    request_data,
    hospital_user: dict
):
    """Create a trusted hospital blood request and notify nearby blood banks."""

    request_document = {
        "hospital_id": hospital_user["id"],

        "hospital_name": hospital_user.get(
            "hospitalName",
            hospital_user.get("name")
        ),

        "patient_reference": request_data.patient_reference,
        "blood_group": request_data.blood_group,
        "units_required": request_data.units_required,
        "urgency": request_data.urgency,

        # The system will now check nearby blood banks
        "status": "CHECKING_BLOOD_BANK",

        "blood_bank_units": 0,
        "donor_units": 0,

        "remaining_units": request_data.units_required,

        "notes": request_data.notes,

        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    # STEP 1: Save blood request
    result = await db.blood_requests.insert_one(
        request_document
    )

    request_document["_id"] = result.inserted_id

    # STEP 2: Automatically find nearby blood banks
    # and create reservation requests
    await create_blood_bank_reservations(
        request_id=str(result.inserted_id),
        hospital_id=hospital_user["id"],
        blood_group=request_data.blood_group,
        units_required=request_data.units_required,
    )

    # STEP 3: Return the created request
    return serialize_request(request_document)

async def get_request_by_id(request_id: str):

    try:
        request = await db.blood_requests.find_one(
            {"_id": ObjectId(request_id)}
        )

    except Exception:
        return None

    if not request:
        return None

    return serialize_request(request)


async def get_hospital_requests(hospital_id: str):

    requests = []

    cursor = db.blood_requests.find(
        {"hospital_id": hospital_id}
    ).sort("created_at", -1)

    async for request in cursor:
        requests.append(
            serialize_request(request)
        )

    return requests