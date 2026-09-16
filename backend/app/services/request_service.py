from datetime import datetime, timezone
from bson import ObjectId
from app.services.blood_bank_matching_service import (
    create_blood_bank_reservations,
)
from app.database.mongodb import db
from app.services.donor_request_service import (
    create_donor_requests_for_blood_request,
)

def calculate_remaining_units(request: dict) -> int:
    """Return the unfulfilled units, including both fulfillment sources."""
    return max(
        int(request.get("units_required", 0))
        - int(request.get("blood_bank_units", 0))
        - int(request.get("donor_units", 0)),
        0,
    )


async def serialize_request(
    request: dict,
) -> dict:
    """
    Convert MongoDB blood request into API response,
    including persisted donor matches.
    """

    donor_matches = []

    # Donor responses are recorded on donor_requests.  Older records may only
    # have donor_matches, so use them as a backwards-compatible fallback.
    cursor = db.donor_requests.find(
        {
            "request_id": str(
                request["_id"]
            )
        }
    ).sort(
        "match_score",
        -1,
    ).limit(10)

    async for match in cursor:

        try:
            donor = await db.users.find_one(
                {
                    "_id": ObjectId(match["donor_id"]),
                    "role": "DONOR",
                }
            )
        except Exception:
            continue

        if not donor:
            continue

        donor_matches.append({
            "donor_id": match["donor_id"],

            "donor_request_id": str(match["_id"]),

            "name": donor.get(
                "name",
                "Donor",
            ),

            "blood_group": match[
                "blood_group"
            ],

            "availability": donor.get(
                "availability",
                "AVAILABLE",
            ),

            "distance": match[
                "distance"
            ],

            "match_score": match[
                "match_score"
            ],

            "trust_score": match[
                "trust_score"
            ],

            "donation_count": donor.get(
                "donationCount",
                0,
            ),

            "last_donation": donor.get("lastDonation"),

            "status": match.get("status", "PENDING"),
        })

    if not donor_matches:
        legacy_cursor = db.donor_matches.find(
            {"request_id": str(request["_id"])}
        ).sort("match_score", -1).limit(10)

        async for match in legacy_cursor:
            try:
                donor = await db.users.find_one({
                    "_id": ObjectId(match["donor_id"]),
                    "role": "DONOR",
                })
            except Exception:
                continue

            if not donor:
                continue

            donor_matches.append({
                "donor_id": match["donor_id"],
                "name": donor.get("name", "Donor"),
                "blood_group": match["blood_group"],
                "availability": donor.get("availability", "AVAILABLE"),
                "distance": match["distance"],
                "match_score": match["match_score"],
                "trust_score": match["trust_score"],
                "donation_count": donor.get("donationCount", 0),
                "last_donation": donor.get("lastDonation"),
                "status": match.get("status", "PENDING"),
            })

    return {
        "id": str(
            request["_id"]
        ),

        "hospital_id": str(
            request["hospital_id"]
        ),

        "hospital_name": request.get(
            "hospital_name"
        ),

        "patient_reference": request[
            "patient_reference"
        ],

        "blood_group": request[
            "blood_group"
        ],

        "units_required": request[
            "units_required"
        ],

        "urgency": request[
            "urgency"
        ],

        "status": request[
            "status"
        ],

        "blood_bank_units": request.get(
            "blood_bank_units",
            0,
        ),

        "donor_units": request.get(
            "donor_units",
            0,
        ),

        # Calculate rather than trust a legacy stored value so every response
        # reflects all confirmed blood-bank and donor contributions.
        "remaining_units": calculate_remaining_units(request),

        "notes": request.get(
            "notes"
        ),

        "created_at": request[
            "created_at"
        ],

        "donors": donor_matches,
    }

async def create_blood_request(
    request_data,
    hospital_user: dict,
):
    request_document = {
        "hospital_id": hospital_user["id"],
        "hospital_name": hospital_user.get(
            "hospitalName",
            hospital_user.get("name"),
        ),
        "patient_reference": request_data.patient_reference,
        "blood_group": request_data.blood_group,
        "units_required": request_data.units_required,
        "urgency": request_data.urgency,
        "status": "CHECKING_BLOOD_BANK",
        "blood_bank_units": 0,
        "donor_units": 0,
        "remaining_units": request_data.units_required,
        "notes": request_data.notes,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    result = await db.blood_requests.insert_one(request_document)
    request_document["_id"] = result.inserted_id

    hospital = await db.users.find_one({
        "_id": ObjectId(hospital_user["id"]),
        "role": "HOSPITAL",
    })

    if hospital and hospital.get("location"):
        reservations = await create_blood_bank_reservations(
            request_id=str(result.inserted_id),
            hospital_id=hospital_user["id"],
            blood_group=request_data.blood_group,
            units_required=request_data.units_required,
            hospital_location=hospital["location"],
        )

        requested_from_banks = sum(r["units_requested"] for r in reservations)
        likely_shortfall = request_data.units_required - requested_from_banks

        new_status = "CHECKING_BLOOD_BANK" if reservations else "DONOR_MATCHING"

        await db.blood_requests.update_one(
            {"_id": result.inserted_id},
            {"$set": {"status": new_status}}
        )
        request_document["status"] = new_status

        if likely_shortfall > 0:
            await create_donor_requests_for_blood_request(
                request_id=str(result.inserted_id),
                hospital_id=hospital_user["id"],
                blood_group=request_data.blood_group,
                hospital_location=hospital["location"],
            )

    return await serialize_request(request_document)

async def get_request_by_id(request_id: str):

    try:
        request = await db.blood_requests.find_one(
            {"_id": ObjectId(request_id)}
        )

    except Exception:
        return None

    if not request:
        return None

    return await serialize_request(
    request
)


async def get_hospital_requests(
    hospital_id: str,
):
    requests = []

    cursor = db.blood_requests.find(
        {
            "hospital_id": hospital_id
        }
    ).sort(
        "created_at",
        -1,
    )

    async for request in cursor:
        requests.append(
            await serialize_request(
                request
            )
        )

    return requests
async def confirm_donation(
    request_id: str,
    donor_request_id: str,
    hospital_id: str,
):
    """
    Confirm that a donor has actually donated blood.

    This is the point where the donation becomes real in
    the system. Simply accepting a donor request does not
    count as a donation.
    """

    # -----------------------------------------------------
    # Get blood request
    # -----------------------------------------------------

    try:
        blood_request = await db.blood_requests.find_one(
            {
                "_id": ObjectId(request_id)
            }
        )
    except Exception:
        return None, "REQUEST_NOT_FOUND"

    if not blood_request:
        return None, "REQUEST_NOT_FOUND"

    # -----------------------------------------------------
    # Security check
    # -----------------------------------------------------

    if blood_request["hospital_id"] != hospital_id:
        return None, "FORBIDDEN"

    # -----------------------------------------------------
    # Check whether request is already fulfilled
    # -----------------------------------------------------

    remaining_units = calculate_remaining_units(
        blood_request
    )

    if remaining_units <= 0:
        return None, "REQUEST_FULFILLED"

    # -----------------------------------------------------
    # Get donor request
    # -----------------------------------------------------

    try:
        donor_request = await db.donor_requests.find_one(
            {
                "_id": ObjectId(donor_request_id)
            }
        )
    except Exception:
        return None, "DONOR_REQUEST_NOT_FOUND"

    if not donor_request:
        return None, "DONOR_REQUEST_NOT_FOUND"

    # -----------------------------------------------------
    # Make sure donor request belongs to this blood request
    # -----------------------------------------------------

    if donor_request.get("request_id") != request_id:
        return None, "FORBIDDEN"

    # -----------------------------------------------------
    # Make sure donor request belongs to this hospital
    # -----------------------------------------------------

    if donor_request.get("hospital_id") != hospital_id:
        return None, "FORBIDDEN"

    # -----------------------------------------------------
    # Only ACCEPTED donors can be marked as donated
    # -----------------------------------------------------

    if donor_request.get("status") != "ACCEPTED":
        return None, "INVALID_STATUS"

    donor_id = donor_request["donor_id"]

    now = datetime.now(timezone.utc)

    # -----------------------------------------------------
    # Mark donor request as DONATED
    # -----------------------------------------------------

    confirmation = await db.donor_requests.update_one(
        {
            "_id": ObjectId(donor_request_id),
            "status": "ACCEPTED",
        },
        {
            "$set": {
                "status": "DONATED",
                "responded_at": now,
                "donated_at": now,
            }
        },
    )

    # The status predicate makes a repeated confirmation safe even if two
    # requests race; only one can record the donation.
    if confirmation.modified_count != 1:
        return None, "INVALID_STATUS"

    # ACCEPTED means the donor agreed.  A completed-donation record is only
    # created after the hospital explicitly confirms the donation.
    await db.donations.insert_one({
        "donor_id": donor_id,
        "request_id": request_id,
        "hospital_id": hospital_id,
        "blood_group": donor_request["blood_group"],
        "units": 1,
        "donated_at": now,
        "status": "COMPLETED",
        "donor_request_id": donor_request_id,
    })

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
                "availability": "UNAVAILABLE",
            },
        },
    )

    # -----------------------------------------------------
    # Add one donated unit to blood request
    # -----------------------------------------------------

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

    new_remaining_units = max(
        units_required
        - blood_bank_units
        - new_donor_units,
        0,
    )

    if new_remaining_units == 0:
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
                "remaining_units": new_remaining_units,
                "status": new_status,
                "updated_at": now,
            }
        },
    )

    # -----------------------------------------------------
    # Update donor match status too
    # -----------------------------------------------------

    await db.donor_matches.update_one(
        {
            "request_id": request_id,
            "donor_id": donor_id,
        },
        {
            "$set": {
                "status": "DONATED",
                "responded_at": now,
            }
        },
    )

    # -----------------------------------------------------
    # Return updated request
    # -----------------------------------------------------

    updated_request = await db.blood_requests.find_one(
        {
            "_id": ObjectId(request_id)
        }
    )

    return await serialize_request(
        updated_request
    ), None
