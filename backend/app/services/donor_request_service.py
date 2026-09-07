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
        request["donated_at"] = request.get(
    "donated_at"
)

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

    # Keep the hospital-facing donor match synchronized
    await db.donor_matches.update_one(
        {
            "request_id": donor_request["request_id"],
            "donor_id": donor_request["donor_id"],
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

    return updated_request, None


async def confirm_donor_donation(
    donor_request_id: str,
    request_id: str,
    hospital_id: str,
):
    """
    Hospital confirms that an accepted donor has actually
    completed the blood donation.
    """

    # -----------------------------------------------------
    # Find donor request
    # -----------------------------------------------------

    try:
        donor_request = await db.donor_requests.find_one(
            {
                "_id": ObjectId(donor_request_id)
            }
        )
    except Exception:
        return None, "NOT_FOUND"

    if not donor_request:
        return None, "NOT_FOUND"

    # -----------------------------------------------------
    # Verify this donor request belongs to the blood request
    # -----------------------------------------------------

    if donor_request.get("request_id") != request_id:
        return None, "FORBIDDEN"

    # -----------------------------------------------------
    # Verify hospital ownership
    # -----------------------------------------------------

    if donor_request.get("hospital_id") != hospital_id:
        return None, "FORBIDDEN"

    # -----------------------------------------------------
    # Donation can only be confirmed after donor accepts
    # -----------------------------------------------------

    if donor_request.get("status") != "ACCEPTED":
        return None, "INVALID_STATUS"

    now = datetime.now(timezone.utc)

    donor_id = donor_request["donor_id"]

    # -----------------------------------------------------
    # Mark donor request as DONATED
    # -----------------------------------------------------

    result = await db.donor_requests.update_one(
        {
            "_id": ObjectId(donor_request_id),
            "status": "ACCEPTED",
        },
        {
            "$set": {
                "status": "DONATED",
                "donated_at": now,
            }
        },
    )

    if result.modified_count == 0:
        return None, "ALREADY_RESPONDED"

    # -----------------------------------------------------
    # Create donation history record
    # -----------------------------------------------------

    donation_document = {
        "donor_id": donor_id,
        "request_id": request_id,
        "hospital_id": hospital_id,
        "blood_group": donor_request["blood_group"],
        "units": 1,
        "donated_at": now,
        "status": "COMPLETED",
        "donor_request_id": donor_request_id,
    }

    await db.donations.insert_one(
        donation_document
    )

    # -----------------------------------------------------
    # Update donor statistics
    # -----------------------------------------------------

    await db.users.update_one(
        {
            "_id": ObjectId(donor_id),
            "role": "DONOR",
        },
        {
            "$inc": {
                "donationCount": 1,
            },
            "$set": {
                "lastDonation": now,
            },
        },
    )

    # -----------------------------------------------------
    # Update blood request
    # -----------------------------------------------------

    try:
        blood_request = await db.blood_requests.find_one(
            {
                "_id": ObjectId(request_id)
            }
        )
    except Exception:
        blood_request = None

    if not blood_request:
        return None, "REQUEST_NOT_FOUND"

    current_donor_units = int(
        blood_request.get(
            "donor_units",
            0,
        )
    )

    new_donor_units = current_donor_units + 1

    units_required = int(
        blood_request.get(
            "units_required",
            0,
        )
    )

    blood_bank_units = int(
        blood_request.get(
            "blood_bank_units",
            0,
        )
    )

    remaining_units = max(
        units_required
        - blood_bank_units
        - new_donor_units,
        0,
    )

    # -----------------------------------------------------
    # Determine request status
    # -----------------------------------------------------

    if remaining_units == 0:
        new_status = "FULFILLED"
    else:
        new_status = "DONOR_MATCHING"

    # -----------------------------------------------------
    # Update blood request
    # -----------------------------------------------------

    await db.blood_requests.update_one(
        {
            "_id": ObjectId(request_id)
        },
        {
            "$set": {
                "donor_units": new_donor_units,
                "remaining_units": remaining_units,
                "status": new_status,
                "updated_at": now,
            }
        },
    )

    # -----------------------------------------------------
    # Return updated donor request
    # -----------------------------------------------------

    updated_request = await db.donor_requests.find_one(
        {
            "_id": ObjectId(donor_request_id)
        }
    )

    if not updated_request:
        return None, "NOT_FOUND"

    updated_request["id"] = str(
        updated_request["_id"]
    )

    del updated_request["_id"]

    return updated_request, None