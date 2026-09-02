from datetime import datetime, timezone

from bson import ObjectId

from app.database.mongodb import db


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


async def get_blood_bank_reservations(blood_bank_id: str):
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


async def get_reservation_by_id(reservation_id: str):

    try:
        reservation = await db.blood_bank_reservations.find_one(
            {
                "_id": ObjectId(reservation_id)
            }
        )

    except Exception:
        return None

    if not reservation:
        return None

    return reservation


async def respond_to_reservation(
    reservation_id: str,
    blood_bank_id: str,
    action: str,
    units_confirmed: int,
):
    """
    Blood bank responds to a reservation request.

    CONFIRM -> confirms the requested units
    PARTIAL -> confirms fewer units
    REJECT  -> confirms zero units
    """

    reservation = await get_reservation_by_id(
        reservation_id
    )

    if not reservation:
        return None, "NOT_FOUND"

    # Security: blood bank can respond only to its own reservation
    if reservation["blood_bank_id"] != blood_bank_id:
        return None, "FORBIDDEN"

    # Prevent responding twice
    if reservation["status"] != "PENDING":
        return None, "ALREADY_RESPONDED"

    units_requested = reservation["units_requested"]

    # Validate CONFIRM
    if action == "CONFIRM":

        if units_confirmed != units_requested:
            return None, "INVALID_CONFIRM"

        new_status = "CONFIRMED"

    # Validate PARTIAL
    elif action == "PARTIAL":

        if (
            units_confirmed <= 0
            or units_confirmed >= units_requested
        ):
            return None, "INVALID_PARTIAL"

        new_status = "PARTIAL"

    # REJECT
    elif action == "REJECT":

        units_confirmed = 0
        new_status = "REJECTED"

    else:
        return None, "INVALID_ACTION"

    await db.blood_bank_reservations.update_one(
        {
            "_id": ObjectId(reservation_id)
        },
        {
            "$set": {
                "status": new_status,
                "units_confirmed": units_confirmed,
                "responded_at": datetime.now(timezone.utc),
            }
        }
    )

    updated_reservation = await db.blood_bank_reservations.find_one(
        {
            "_id": ObjectId(reservation_id)
        }
    )

    return serialize_reservation(updated_reservation), None