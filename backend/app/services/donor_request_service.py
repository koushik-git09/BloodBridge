from datetime import datetime, timezone
from bson import ObjectId

from app.database.mongodb import db
from app.services.donor_matching_service import find_matching_donors


async def create_donor_requests_for_blood_request(
    request_id: str,
    hospital_id: str,
    blood_group: str,
    hospital_location: dict,
):
    """
    Find compatible donors for a blood request and create
    donor request records for the matched donors.
    """

    donors = await find_matching_donors(
        request_id=request_id,
        blood_group=blood_group,
        hospital_location=hospital_location,
        limit=10,
    )

    created_requests = []

    for donor in donors:

        donor_id = donor["donor_id"]

        # Prevent duplicate requests
        existing = await db.donor_requests.find_one({
            "request_id": request_id,
            "donor_id": donor_id,
        })

        if existing:
            continue

        donor_request = {
            "request_id": request_id,
            "donor_id": donor_id,
            "hospital_id": hospital_id,
            "blood_group": blood_group,

            "distance": donor["distance"],
            "match_score": donor["match_score"],
            "trust_score": donor.get("trust_score", 50),

            "status": "PENDING",

            "created_at": datetime.now(timezone.utc),
            "responded_at": None,
        }

        result = await db.donor_requests.insert_one(
            donor_request
        )

        donor_request["_id"] = result.inserted_id

        created_requests.append(donor_request)

    return created_requests


async def get_donor_requests_for_donor(
    donor_id: str,
):
    """
    Get all donor requests belonging to the logged-in donor.
    """

    requests = []

    cursor = db.donor_requests.find(
        {
            "donor_id": donor_id
        }
    ).sort(
        "created_at",
        -1,
    )

    async for request in cursor:

        request["id"] = str(request["_id"])
        del request["_id"]

        # Get blood request information
        try:
            blood_request = await db.blood_requests.find_one(
                {
                    "_id": ObjectId(
                        request["request_id"]
                    )
                }
            )
        except Exception:
            blood_request = None

        if blood_request:

            request["hospital_name"] = blood_request.get(
                "hospital_name"
            )

            request["urgency"] = blood_request.get(
                "urgency"
            )

            request["units_required"] = blood_request.get(
                "units_required"
            )

            request["patient_reference"] = blood_request.get(
                "patient_reference"
            )

        requests.append(request)

    return requests


async def respond_to_donor_request(
    donor_request_id: str,
    donor_id: str,
    action: str,
):
    """
    Accept or decline a donor request.
    """

    try:
        donor_request = await db.donor_requests.find_one(
            {
                "_id": ObjectId(donor_request_id)
            }
        )
    except Exception:
        donor_request = None

    if not donor_request:
        return None, "NOT_FOUND"

    # Security check
    if donor_request["donor_id"] != donor_id:
        return None, "FORBIDDEN"

    # Prevent multiple responses
    if donor_request.get("status") != "PENDING":
        return None, "ALREADY_RESPONDED"

    if action not in ["ACCEPT", "DECLINE"]:
        return None, "INVALID_ACTION"

    new_status = (
        "ACCEPTED"
        if action == "ACCEPT"
        else "DECLINED"
    )

    await db.donor_requests.update_one(
        {
            "_id": ObjectId(donor_request_id)
        },
        {
            "$set": {
                "status": new_status,
                "responded_at": datetime.now(
                    timezone.utc
                ),
            }
        },
    )

    updated_request = await db.donor_requests.find_one(
        {
            "_id": ObjectId(donor_request_id)
        }
    )

    updated_request["id"] = str(
        updated_request["_id"]
    )

    del updated_request["_id"]

    return updated_request, None