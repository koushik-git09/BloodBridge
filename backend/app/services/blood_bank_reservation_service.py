from datetime import datetime, timezone

from bson import ObjectId

from app.database.mongodb import db

from app.services.donor_matching_service import (
    find_matching_donors,
)

from app.services.donor_request_service import (
    create_donor_requests,
)


def serialize_reservation(reservation: dict) -> dict:
    """Convert MongoDB reservation document to API response."""

    return {
        "id": str(reservation["_id"]),
        "request_id": reservation["request_id"],
        "blood_bank_id": reservation["blood_bank_id"],
        "hospital_id": reservation["hospital_id"],
        "blood_group": reservation["blood_group"],
        "units_requested": reservation["units_requested"],
        "units_confirmed": reservation.get(
            "units_confirmed",
            0
        ),
        "status": reservation["status"],
        "distance": reservation["distance"],
        "created_at": reservation["created_at"],
        "responded_at": reservation.get("responded_at"),
    }


async def get_blood_bank_reservations(
    blood_bank_id: str
):
    """Get all reservations sent to the logged-in blood bank."""

    reservations = []

    cursor = db.blood_bank_reservations.find(
        {
            "blood_bank_id": blood_bank_id
        }
    ).sort(
        "created_at",
        -1
    )

    async for reservation in cursor:

        reservations.append(
            serialize_reservation(reservation)
        )

    return reservations


async def get_reservation_by_id(
    reservation_id: str
):
    """Get a reservation by ID."""

    try:

        reservation = (
            await db.blood_bank_reservations.find_one(
                {
                    "_id": ObjectId(reservation_id)
                }
            )
        )

    except Exception:

        return None

    return reservation


async def update_main_blood_request(
    request_id: str,
    units_confirmed: int,
):
    """
    Update the main blood request after
    a blood bank responds.
    """

    try:

        blood_request = await db.blood_requests.find_one(
            {
                "_id": ObjectId(request_id)
            }
        )

    except Exception:

        return None

    if not blood_request:

        return None

    current_bank_units = blood_request.get(
        "blood_bank_units",
        0
    )

    new_blood_bank_units = (
        current_bank_units + units_confirmed
    )

    units_required = blood_request[
        "units_required"
    ]

    remaining_units = max(
        units_required - new_blood_bank_units,
        0
    )

    # -----------------------------------------
    # Update request status
    # -----------------------------------------

    if remaining_units == 0:

        new_status = "FULFILLED"

    elif new_blood_bank_units > 0:

        new_status = "PARTIAL_FULFILLMENT"

    else:

        new_status = "CHECKING_BLOOD_BANK"

    # -----------------------------------------
    # Update MongoDB
    # -----------------------------------------

    await db.blood_requests.update_one(
        {
            "_id": ObjectId(request_id)
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
        }
    )

    return await db.blood_requests.find_one(
        {
            "_id": ObjectId(request_id)
        }
    )


async def update_blood_bank_inventory(
    blood_bank_id: str,
    blood_group: str,
    units_confirmed: int,
):
    """
    Deduct confirmed blood units from
    the blood bank inventory.
    """

    if units_confirmed <= 0:

        return

    blood_bank = await db.users.find_one(
        {
            "_id": ObjectId(blood_bank_id),
            "role": "BLOOD_BANK",
        }
    )

    if not blood_bank:

        return

    inventory = blood_bank.get(
        "inventory",
        {}
    )

    available_units = inventory.get(
        blood_group,
        0
    )

    new_units = max(
        available_units - units_confirmed,
        0
    )

    await db.users.update_one(
        {
            "_id": ObjectId(blood_bank_id)
        },
        {
            "$set": {
                f"inventory.{blood_group}": new_units,

                "last_inventory_update":
                    datetime.now(timezone.utc),

                "updated_at":
                    datetime.now(timezone.utc),
            }
        }
    )


async def are_all_blood_banks_responded(
    request_id: str
):
    """
    Check whether all blood bank reservations
    for this blood request have been answered.
    """

    pending_count = (
        await db.blood_bank_reservations.count_documents(
            {
                "request_id": request_id,
                "status": "PENDING",
            }
        )
    )

    return pending_count == 0


async def start_donor_matching_if_needed(
    request_id: str
):
    """
    Start donor matching only when:

    1. All blood banks have responded.
    2. Blood is still required.
    3. Donor matching has not already started.
    """

    # -----------------------------------------
    # Check all blood banks responded
    # -----------------------------------------

    all_responded = (
        await are_all_blood_banks_responded(
            request_id
        )
    )

    if not all_responded:

        return

    # -----------------------------------------
    # Get blood request
    # -----------------------------------------

    try:

        blood_request = await db.blood_requests.find_one(
            {
                "_id": ObjectId(request_id)
            }
        )

    except Exception:

        return

    if not blood_request:

        return

    remaining_units = blood_request.get(
        "remaining_units",
        0
    )

    # -----------------------------------------
    # Already fulfilled
    # -----------------------------------------

    if remaining_units <= 0:

        return

    current_status = blood_request.get(
        "status"
    )

    # -----------------------------------------
    # Prevent duplicate donor matching
    # -----------------------------------------

    if current_status == "DONOR_MATCHING":

        return

    # Extra safety:
    # Check whether donor requests already exist

    existing_donor_requests = (
        await db.donor_requests.count_documents(
            {
                "request_id": request_id
            }
        )
    )

    if existing_donor_requests > 0:

        return

    # -----------------------------------------
    # Find top 10 nearest donors
    # -----------------------------------------

    matched_donors = (
        await find_matching_donors(
            request_id
        )
    )

    # -----------------------------------------
    # No eligible donors found
    # -----------------------------------------

    if not matched_donors:

        await db.blood_requests.update_one(
            {
                "_id": ObjectId(request_id)
            },
            {
                "$set": {
                    "status": "DONOR_MATCHING",
                    "updated_at": datetime.now(
                        timezone.utc
                    ),
                }
            }
        )

        return

    # -----------------------------------------
    # Create donor request records
    # -----------------------------------------

    await create_donor_requests(
        blood_request=blood_request,
        matched_donors=matched_donors,
    )

    # -----------------------------------------
    # Update main request status
    # -----------------------------------------

    await db.blood_requests.update_one(
        {
            "_id": ObjectId(request_id)
        },
        {
            "$set": {
                "status": "DONOR_MATCHING",
                "updated_at": datetime.now(
                    timezone.utc
                ),
            }
        }
    )


async def respond_to_reservation(
    reservation_id: str,
    blood_bank_id: str,
    action: str,
    units_confirmed: int,
):
    """
    Blood bank responds to a reservation.

    CONFIRM:
        Confirm all requested units.

    PARTIAL:
        Confirm fewer than requested units.

    REJECT:
        Confirm zero units.

    After all blood banks respond:

        If blood is still required:
            Find top 10 nearest eligible donors.
    """

    # -----------------------------------------
    # Get reservation
    # -----------------------------------------

    reservation = await get_reservation_by_id(
        reservation_id
    )

    if not reservation:

        return None, "NOT_FOUND"

    # -----------------------------------------
    # Security check
    # -----------------------------------------

    if (
        reservation["blood_bank_id"]
        != blood_bank_id
    ):

        return None, "FORBIDDEN"

    # -----------------------------------------
    # Prevent duplicate responses
    # -----------------------------------------

    if reservation["status"] != "PENDING":

        return None, "ALREADY_RESPONDED"

    units_requested = reservation[
        "units_requested"
    ]

    # -----------------------------------------
    # Validate response
    # -----------------------------------------

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

    # -----------------------------------------
    # STEP 1
    # Update reservation
    # -----------------------------------------

    await db.blood_bank_reservations.update_one(
        {
            "_id": ObjectId(reservation_id)
        },
        {
            "$set": {
                "status": new_status,

                "units_confirmed":
                    units_confirmed,

                "responded_at":
                    datetime.now(timezone.utc),
            }
        }
    )

    # -----------------------------------------
    # STEP 2
    # Update blood bank inventory
    # -----------------------------------------

    await update_blood_bank_inventory(
        blood_bank_id=blood_bank_id,

        blood_group=reservation[
            "blood_group"
        ],

        units_confirmed=units_confirmed,
    )

    # -----------------------------------------
    # STEP 3
    # Update main blood request
    # -----------------------------------------

    await update_main_blood_request(
        request_id=reservation[
            "request_id"
        ],

        units_confirmed=units_confirmed,
    )

    # -----------------------------------------
    # STEP 4
    # Check whether all blood banks responded
    #
    # If yes and blood is still needed:
    #
    # Find top 10 donors
    # -----------------------------------------

    await start_donor_matching_if_needed(
        reservation["request_id"]
    )

    # -----------------------------------------
    # STEP 5
    # Get updated reservation
    # -----------------------------------------

    updated_reservation = (
        await db.blood_bank_reservations.find_one(
            {
                "_id": ObjectId(reservation_id)
            }
        )
    )

    return (
        serialize_reservation(
            updated_reservation
        ),
        None
    )