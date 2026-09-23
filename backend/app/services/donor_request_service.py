from datetime import datetime, timezone
import logging
from bson import ObjectId

from app.database.mongodb import db
from app.services.donor_matching_service import find_matching_donors
from app.services.notification_service import send_notification_to_user

logger = logging.getLogger("bloodbridge.donor_requests")


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

    # Get blood request details for notification
    try:
        blood_req = await db.blood_requests.find_one({"_id": ObjectId(request_id)})
    except Exception:
        blood_req = None

    hospital_name = (blood_req.get("hospital_name") if blood_req else None) or "Hospital"
    urgency = (blood_req.get("urgency") if blood_req else None) or "NORMAL"
    patient_ref = (blood_req.get("patient_reference") if blood_req else None) or ""
    is_emergency = urgency in ["CRITICAL", "URGENT"]

    for donor in donors:

        donor_id = donor["donor_id"]

        # Prevent duplicate requests
        existing = await db.donor_requests.find_one({
            "request_id": request_id,
            "donor_id": donor_id,
        })

        if existing:
            continue

        hospital_address = (hospital_location or {}).get("address", "")
        donor_request = {
            "request_id": request_id,
            "donor_id": donor_id,
            "hospital_id": hospital_id,
            "hospital_name": hospital_name,
            "hospital_address": hospital_address,
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

        # Dispatch FCM and in-app emergency/standard notification to matched donor
        notif_title = "🚨 EMERGENCY BLOOD REQUEST" if is_emergency else "New Blood Request"
        loc_suffix = f" Location: {hospital_address} ({donor['distance']} km away)." if hospital_address else f" ({donor['distance']} km away)."
        notif_msg = (
            f"{blood_group} blood is urgently required at {hospital_name}.{loc_suffix}"
            if is_emergency
            else f"{blood_group} blood is required at {hospital_name}.{loc_suffix}"
        )
        notif_type = "EMERGENCY_BLOOD_REQUEST" if is_emergency else "BLOOD_REQUEST"

        try:
            await send_notification_to_user(
                user_id=donor_id,
                title=notif_title,
                message=notif_msg,
                notification_type=notif_type,
                data={
                    "type": notif_type,
                    "request_id": request_id,
                    "donor_request_id": str(result.inserted_id),
                    "blood_group": blood_group,
                    "urgency": urgency,
                    "hospital_name": hospital_name,
                    "hospital_address": hospital_address,
                    "distance": str(donor["distance"]),
                    "patient_reference": patient_ref,
                    "notification_type": notif_type,
                },
                urgency=urgency,
                dedup_key=f"donor_req_alert:{request_id}:{donor_id}",
            )
        except Exception as e:
            logger.warning(f"Failed to dispatch notification to donor {donor_id}: {e}")


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
            request["hospital_address"] = blood_request.get(
                "hospital_address"
            ) or request.get("hospital_address")
            request["urgency"] = blood_request.get(
                "urgency"
            )
            request["units_required"] = blood_request.get(
                "units_required"
            )
            request["patient_reference"] = blood_request.get(
                "patient_reference"
            )

        if not request.get("hospital_address"):
            try:
                h_user = await db.users.find_one({"_id": ObjectId(request["hospital_id"])})
                if h_user:
                    request["hospital_address"] = (h_user.get("location") or {}).get("address", "")
                    request["hospital_phone"] = h_user.get("phone")
                    if not request.get("hospital_name"):
                        request["hospital_name"] = h_user.get("hospitalName", h_user.get("name"))
            except Exception:
                pass

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

    # Notify hospital that a donor has accepted the blood request (without exposing donor phone in push)
    if action == "ACCEPT":
        try:
            await send_notification_to_user(
                user_id=donor_request["hospital_id"],
                title="Donor Accepted",
                message="A matched donor has accepted your blood request.",
                notification_type="DONOR_ACCEPTED",
                data={
                    "type": "DONOR_ACCEPTED",
                    "request_id": donor_request["request_id"],
                    "donor_request_id": donor_request_id,
                    "blood_group": donor_request.get("blood_group", ""),
                    "notification_type": "DONOR_ACCEPTED",
                },
                urgency="NORMAL",
                dedup_key=f"donor_accepted:{donor_request['request_id']}:{donor_request_id}",
            )
        except Exception as e:
            logger.warning(f"Failed to notify hospital of donor acceptance: {e}")

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

    # Notify donor that their donation has been confirmed and recorded
    try:
        await send_notification_to_user(
            user_id=donor_id,
            title="Donation Completed",
            message="Your donation has been recorded successfully.",
            notification_type="DONATION_COMPLETED",
            data={
                "type": "DONATION_COMPLETED",
                "request_id": request_id,
                "donor_request_id": donor_request_id,
                "blood_group": donor_request.get("blood_group", ""),
                "notification_type": "DONATION_COMPLETED",
            },
            urgency="NORMAL",
            dedup_key=f"donation_completed:{request_id}:{donor_request_id}",
        )
    except Exception as e:
        logger.warning(f"Failed to notify donor of donation completion: {e}")

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

    update_data = {
        "donor_units": new_donor_units,
        "remaining_units": remaining_units,
        "status": new_status,
        "updated_at": now,
    }

    if remaining_units == 0 and not blood_request.get("fulfilled_at"):
        update_data["fulfilled_at"] = now

    await db.blood_requests.update_one(
        {
            "_id": ObjectId(request_id)
        },
        {
            "$set": update_data
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