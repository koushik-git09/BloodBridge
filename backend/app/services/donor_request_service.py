from datetime import datetime, timezone

from app.database.mongodb import db


async def create_donor_requests(
    blood_request: dict,
    matched_donors: list[dict],
):
    """
    Create donor request records for the top matched donors.

    BloodBridge sends the request simultaneously
    to up to 10 nearest eligible donors.
    """

    donor_requests = []

    for donor in matched_donors:

        donor_request = {
            "request_id": str(blood_request["_id"]),

            "donor_id": donor["donor_id"],

            "hospital_id": blood_request["hospital_id"],

            "blood_group": blood_request["blood_group"],

            "units_needed": blood_request["remaining_units"],

            "distance": donor["distance"],

            "match_score": donor["match_score"],

            "status": "PENDING",

            "created_at": datetime.now(timezone.utc),

            "responded_at": None,
        }

        donor_requests.append(donor_request)

    if donor_requests:

        await db.donor_requests.insert_many(
            donor_requests
        )

    return donor_requests