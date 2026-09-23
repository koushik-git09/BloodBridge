import logging
from datetime import datetime, timezone

from bson import ObjectId

from app.database.mongodb import db

from app.services.donor_matching_service import (
    find_matching_donors,
)

logger = logging.getLogger("bloodbridge.reservations")


# =========================================================
# SERIALIZE RESERVATION
# =========================================================

async def serialize_reservation(
    reservation: dict,
) -> dict:
    hospital_name = reservation.get("hospital_name")
    hospital_address = reservation.get("hospital_address")
    blood_bank_name = reservation.get("blood_bank_name")
    blood_bank_address = reservation.get("blood_bank_address")
    urgency = reservation.get("urgency")

    if not hospital_name or not urgency or not hospital_address:
        try:
            req = await db.blood_requests.find_one(
                {"_id": ObjectId(reservation["request_id"])}
            )
            if req:
                if not hospital_name:
                    hospital_name = req.get("hospital_name")
                if not urgency:
                    urgency = req.get("urgency")
                if not hospital_address:
                    hospital_address = req.get("hospital_address")
        except Exception:
            pass

        if not hospital_name or not hospital_address:
            try:
                hospital = await db.users.find_one(
                    {"_id": ObjectId(reservation["hospital_id"])}
                )
                if hospital:
                    if not hospital_name:
                        hospital_name = hospital.get(
                            "hospitalName", hospital.get("name")
                        )
                    if not hospital_address:
                        hospital_address = (hospital.get("location") or {}).get("address", "")
            except Exception:
                pass

    if not blood_bank_name or not blood_bank_address:
        try:
            blood_bank = await db.users.find_one(
                {"_id": ObjectId(reservation["blood_bank_id"])}
            )
            if blood_bank:
                if not blood_bank_name:
                    blood_bank_name = blood_bank.get("name", "Blood Bank")
                if not blood_bank_address:
                    blood_bank_address = (blood_bank.get("location") or {}).get("address", "")
        except Exception:
            pass

    return {
        "id": str(reservation["_id"]),
        "request_id": reservation["request_id"],
        "blood_bank_id": reservation["blood_bank_id"],
        "hospital_id": reservation["hospital_id"],
        "hospital_name": hospital_name,
        "hospital_address": hospital_address,
        "blood_bank_name": blood_bank_name,
        "blood_bank_address": blood_bank_address,
        "urgency": urgency,
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
            await serialize_reservation(
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

from app.services.donor_request_service import (
    create_donor_requests_for_blood_request,
)

async def run_donor_matching_for_request(
    request: dict,
):
    """
    Find and persist donor requests for a blood request's
    remaining unfulfilled units.
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
                "_id": ObjectId(request["hospital_id"]),
                "role": "HOSPITAL",
            }
        )
    except Exception:
        return []

    if not hospital:
        return []

    hospital_location = hospital.get("location")

    if not hospital_location:
        return []

    return await create_donor_requests_for_blood_request(
        request_id=str(request["_id"]),
        hospital_id=request["hospital_id"],
        blood_group=request["blood_group"],
        hospital_location=hospital_location,
    )


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
    # Check pending reservations for this request
    # -----------------------------------------------------
    pending_count = await db.blood_bank_reservations.count_documents(
        {
            "request_id": request_id,
            "status": "PENDING",
        }
    )

    # -----------------------------------------------------
    # Determine status
    # -----------------------------------------------------

    if remaining_units == 0:
        new_status = "FULFILLED"
    elif pending_count > 0:
        new_status = "CHECKING_BLOOD_BANK"
    else:
        new_status = "DONOR_MATCHING"

    # -----------------------------------------------------
    # Update request
    # -----------------------------------------------------

    update_data = {
        "blood_bank_units": new_blood_bank_units,
        "remaining_units": remaining_units,
        "status": new_status,
        "updated_at": datetime.now(timezone.utc),
    }

    if remaining_units == 0 and not blood_request.get("fulfilled_at"):
        update_data["fulfilled_at"] = datetime.now(timezone.utc)

    await db.blood_requests.update_one(
        {
            "_id": ObjectId(
                request_id
            )
        },
        {
            "$set": update_data
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
    # If all blood banks responded and units remain,
    # start donor matching now.
    # -----------------------------------------------------

    if (
        updated_request
        and remaining_units > 0
        and pending_count == 0
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

    blood_bank = await db.users.find_one(
        {
            "_id": ObjectId(blood_bank_id),
            "role": "BLOOD_BANK",
        }
    )

    if not blood_bank:
        return None, "NOT_FOUND"

    inventory = blood_bank.get("inventory", {})
    available_stock = int(inventory.get(reservation["blood_group"], 0))

    # -----------------------------------------------------
    # Validate action and inventory stock
    # -----------------------------------------------------

    if action == "CONFIRM":

        if available_stock <= 0:
            return None, "NO_STOCK_AVAILABLE"

        if units_requested > available_stock:
            return None, "INSUFFICIENT_STOCK"

        if units_confirmed != units_requested:
            return None, "INVALID_CONFIRM"

        new_status = "CONFIRMED"

    elif action == "PARTIAL":

        if available_stock <= 0:
            return None, "NO_STOCK_AVAILABLE"

        if units_confirmed > available_stock:
            return None, "INSUFFICIENT_STOCK"

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
    # Notify hospital of blood bank's response
    # -----------------------------------------------------
    try:
        from app.services.notification_service import send_notification_to_user
        bank_name = blood_bank.get("name", "Blood Bank")
        bb_address = (blood_bank.get("location") or {}).get("address", "")
        addr_txt = f" Address: {bb_address}." if bb_address else ""

        if action == "CONFIRM":
            h_title = "✅ Blood Units Confirmed"
            h_msg = f"{bank_name} confirmed {units_confirmed} unit(s) of {reservation['blood_group']}.{addr_txt}"
        elif action == "PARTIAL":
            h_title = "⚠️ Partial Units Confirmed"
            h_msg = f"{bank_name} confirmed {units_confirmed} unit(s) of {reservation['blood_group']}. Searching nearby donors for remaining units.{addr_txt}"
        else:
            h_title = "❌ Blood Bank Unavailable"
            h_msg = f"{bank_name} could not fulfill {reservation['blood_group']} units. Initiating donor matching."

        await send_notification_to_user(
            user_id=reservation["hospital_id"],
            title=h_title,
            message=h_msg,
            notification_type="BLOOD_BANK_RESPONSE",
            data={
                "type": "BLOOD_BANK_RESPONSE",
                "request_id": reservation["request_id"],
                "reservation_id": reservation_id,
                "blood_bank_id": blood_bank_id,
                "blood_bank_name": bank_name,
                "blood_bank_address": bb_address,
                "action": action,
                "units_confirmed": units_confirmed,
                "blood_group": reservation["blood_group"],
                "notification_type": "BLOOD_BANK_RESPONSE",
            },
            urgency="HIGH" if action == "CONFIRM" else "NORMAL",
            dedup_key=f"bb_res_ack:{reservation_id}:{action}",
        )
    except Exception as e:
        logger.warning(f"Failed to notify hospital of blood bank response: {e}")

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
        await serialize_reservation(
            updated_reservation
        ),
        None,
    )

