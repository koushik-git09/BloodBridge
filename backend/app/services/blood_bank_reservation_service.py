from datetime import datetime, timezone

from bson import ObjectId

from app.database.mongodb import db

from app.services.donor_matching_service import (
    find_matching_donors,
)


# =========================================================
# SERIALIZE RESERVATION
# =========================================================

def serialize_reservation(
    reservation: dict,
) -> dict:
    return {
        "id": str(reservation["_id"]),
        "request_id": reservation["request_id"],
        "blood_bank_id": reservation["blood_bank_id"],
        "hospital_id": reservation["hospital_id"],
        "blood_group": reservation["blood_group"],
        "units_requested": reservation["units_requested"],
        "units_confirmed": reservation.get(
            "units_confirmed",
            0,
        ),
        "status": reservation["status"],
        "distance": reservation["distance"],
        "created_at": reservation["created_at"],
        "responded_at": reservation.get(
            "responded_at"
        ),
    }


# =========================================================
# GET RESERVATIONS
# =========================================================

async def get_blood_bank_reservations(
    blood_bank_id: str,
):
    reservations = []

    cursor = db.blood_bank_reservations.find(
        {
            "blood_bank_id": blood_bank_id
        }
    ).sort(
        "created_at",
        -1,
    )

    async for reservation in cursor:
        reservations.append(
            serialize_reservation(
                reservation
            )
        )

    return reservations


# =========================================================
# GET SINGLE RESERVATION
# =========================================================

async def get_reservation_by_id(
    reservation_id: str,
):
    try:
        return await db.blood_bank_reservations.find_one(
            {
                "_id": ObjectId(
                    reservation_id
                )
            }
        )
    except Exception:
        return None


# =========================================================
# RUN DONOR MATCHING
# =========================================================

async def run_donor_matching_for_request(
    request: dict,
):
    """
    Find and persist donor matches for a blood request.

    Existing donor matches for the same request are
    preserved so we don't create duplicates.
    """

    remaining_units = max(
        int(request["units_required"])
        - int(request.get("blood_bank_units", 0))
        - int(request.get("donor_units", 0)),
        0,
    )

    if remaining_units <= 0:
        return []

    try:
        hospital = await db.users.find_one(
            {
                "_id": ObjectId(
                    request["hospital_id"]
                ),
                "role": "HOSPITAL",
            }
        )
    except Exception:
        return []

    if not hospital:
        return []

    hospital_location = hospital.get(
        "location"
    )

    if not hospital_location:
        return []

    # -----------------------------------------------------
    # Find top 10 real donors
    # -----------------------------------------------------

    donors = await find_matching_donors(
        request_id=str(
            request["_id"]
        ),
        blood_group=request["blood_group"],
        hospital_location=hospital_location,
        limit=10,
    )

    # -----------------------------------------------------
    # Save donor matches
    # -----------------------------------------------------

    saved_matches = []
    existing_match_count = await db.donor_matches.count_documents(
        {
            "request_id": str(request["_id"]),
        }
    )

    for donor in donors:

        if existing_match_count >= 10:
            break

        # Don't create duplicate matches
        existing_match = (
            await db.donor_matches.find_one(
                {
                    "request_id": str(
                        request["_id"]
                    ),
                    "donor_id": donor["donor_id"],
                }
            )
        )

        if existing_match:
            saved_matches.append(
                existing_match
            )
            continue

        match_document = {
            "request_id": str(
                request["_id"]
            ),

            "donor_id": donor["donor_id"],

            "hospital_id": request[
                "hospital_id"
            ],

            "blood_group": donor[
                "blood_group"
            ],

            "distance": donor[
                "distance"
            ],

            "match_score": donor[
                "match_score"
            ],

            "trust_score": donor[
                "trust_score"
            ],

            "donation_count": donor[
                "donation_count"
            ],

            "availability": donor[
                "availability"
            ],

            "status": "PENDING",

            "created_at": datetime.now(
                timezone.utc
            ),

            "responded_at": None,
        }

        result = await db.donor_matches.insert_one(
            match_document
        )

        match_document["_id"] = (
            result.inserted_id
        )

        saved_matches.append(
            match_document
        )
        existing_match_count += 1

    return saved_matches


# =========================================================
# UPDATE MAIN BLOOD REQUEST
# =========================================================

async def update_main_blood_request(
    request_id: str,
    units_confirmed: int,
):
    try:
        blood_request = await db.blood_requests.find_one(
            {
                "_id": ObjectId(
                    request_id
                )
            }
        )
    except Exception:
        return None

    if not blood_request:
        return None

    current_bank_units = blood_request.get(
        "blood_bank_units",
        0,
    )

    new_blood_bank_units = (
        current_bank_units
        + units_confirmed
    )

    units_required = blood_request[
        "units_required"
    ]

    donor_units = int(
        blood_request.get(
            "donor_units",
            0,
        )
    )

    remaining_units = max(
        units_required
        - new_blood_bank_units
        - donor_units,
        0,
    )

    # -----------------------------------------------------
    # Determine status
    # -----------------------------------------------------

    if remaining_units == 0:

        new_status = "FULFILLED"

    else:

        new_status = "DONOR_MATCHING"

    # -----------------------------------------------------
    # Update request
    # -----------------------------------------------------

    await db.blood_requests.update_one(
        {
            "_id": ObjectId(
                request_id
            )
        },
        {
            "$set": {
                "blood_bank_units": new_blood_bank_units,

                "remaining_units": remaining_units,

                "status": new_status,

                "updated_at": datetime.now(
                    timezone.utc
                ),
            }
        },
    )

    updated_request = (
        await db.blood_requests.find_one(
            {
                "_id": ObjectId(
                    request_id
                )
            }
        )
    )

    # -----------------------------------------------------
    # If blood bank could not fully fulfill the request,
    # automatically start donor matching.
    # -----------------------------------------------------

    if (
        updated_request
        and remaining_units > 0
    ):
        await run_donor_matching_for_request(
            updated_request
        )

    return updated_request


# =========================================================
# UPDATE BLOOD BANK INVENTORY
# =========================================================

async def update_blood_bank_inventory(
    blood_bank_id: str,
    blood_group: str,
    units_confirmed: int,
):
    if units_confirmed <= 0:
        return

    try:
        blood_bank = await db.users.find_one(
            {
                "_id": ObjectId(
                    blood_bank_id
                ),
                "role": "BLOOD_BANK",
            }
        )
    except Exception:
        return

    if not blood_bank:
        return

    inventory = blood_bank.get(
        "inventory",
        {},
    )

    available_units = int(
        inventory.get(
            blood_group,
            0,
        )
    )

    new_units = max(
        available_units
        - units_confirmed,
        0,
    )

    await db.users.update_one(
        {
            "_id": ObjectId(
                blood_bank_id
            )
        },
        {
            "$set": {
                f"inventory.{blood_group}": new_units,

                "last_inventory_update": datetime.now(
                    timezone.utc
                ),
            }
        },
    )


# =========================================================
# RESPOND TO RESERVATION
# =========================================================

async def respond_to_reservation(
    reservation_id: str,
    blood_bank_id: str,
    action: str,
    units_confirmed: int,
):
    reservation = await get_reservation_by_id(
        reservation_id
    )

    if not reservation:
        return None, "NOT_FOUND"

    # -----------------------------------------------------
    # Security check
    # -----------------------------------------------------

    if reservation[
        "blood_bank_id"
    ] != blood_bank_id:
        return None, "FORBIDDEN"

    # -----------------------------------------------------
    # Prevent duplicate response
    # -----------------------------------------------------

    if reservation["status"] != "PENDING":
        return None, "ALREADY_RESPONDED"

    units_requested = reservation[
        "units_requested"
    ]

    # -----------------------------------------------------
    # Validate action
    # -----------------------------------------------------

    if action == "CONFIRM":

        if units_confirmed != units_requested:
            return None, "INVALID_CONFIRM"

        new_status = "CONFIRMED"

    elif action == "PARTIAL":

        if (
            units_confirmed <= 0
            or units_confirmed >= units_requested
        ):
            return None, "INVALID_PARTIAL"

        new_status = "PARTIAL"

    elif action == "REJECT":

        units_confirmed = 0

        new_status = "REJECTED"

    else:

        return None, "INVALID_ACTION"

    # -----------------------------------------------------
    # Update reservation
    # -----------------------------------------------------

    await db.blood_bank_reservations.update_one(
        {
            "_id": ObjectId(
                reservation_id
            )
        },
        {
            "$set": {
                "status": new_status,

                "units_confirmed": units_confirmed,

                "responded_at": datetime.now(
                    timezone.utc
                ),
            }
        },
    )

    # -----------------------------------------------------
    # Deduct confirmed units from inventory
    # -----------------------------------------------------

    await update_blood_bank_inventory(
        blood_bank_id=blood_bank_id,

        blood_group=reservation[
            "blood_group"
        ],

        units_confirmed=units_confirmed,
    )

    # -----------------------------------------------------
    # Update hospital request
    # -----------------------------------------------------

    await update_main_blood_request(
        request_id=reservation[
            "request_id"
        ],

        units_confirmed=units_confirmed,
    )

    # -----------------------------------------------------
    # Get updated reservation
    # -----------------------------------------------------

    updated_reservation = (
        await db.blood_bank_reservations.find_one(
            {
                "_id": ObjectId(
                    reservation_id
                )
            }
        )
    )

    return (
        serialize_reservation(
            updated_reservation
        ),
        None,
    )
