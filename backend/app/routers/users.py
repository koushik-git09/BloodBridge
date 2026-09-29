from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Literal
from bson import ObjectId

from datetime import datetime, timezone

from app.database.mongodb import db
from app.dependencies.auth import require_role, get_current_user


router = APIRouter(
    prefix="/api/users",
    tags=["Users"],
)


@router.get("/me")
async def get_my_user(
    current_user=Depends(get_current_user),
):
    """
    Get the currently logged-in user's profile.
    """
    return current_user



class AvailabilityUpdate(BaseModel):
    availability: Literal[
        "AVAILABLE",
        "BUSY",
        "UNAVAILABLE",
    ]


@router.patch(
    "/me/availability",
)
async def update_my_availability(
    data: AvailabilityUpdate,
    current_user=Depends(
        require_role("DONOR")
    ),
):
    """
    Update the availability status of the
    currently logged-in donor.
    """

    donor_id = current_user["id"]

    try:
        donor_object_id = ObjectId(donor_id)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid donor ID",
        )

    now = datetime.now(timezone.utc)
    update_fields: dict = {
        "availability": data.availability,
        "availabilityUpdatedAt": now,
    }
    if data.availability == "AVAILABLE":
        update_fields["cooldownOverride"] = True
    elif data.availability == "UNAVAILABLE":
        update_fields["cooldownOverride"] = False

    result = await db.users.update_one(
        {
            "_id": donor_object_id,
            "role": "DONOR",
        },
        {
            "$set": update_fields,
        },
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Donor not found",
        )

    # If donor just became AVAILABLE, match them with any currently active blood requests in DONOR_MATCHING
    if data.availability == "AVAILABLE":
        try:
            from app.services.donor_request_service import create_donor_requests_for_blood_request
            active_requests_cursor = db.blood_requests.find({
                "status": {"$in": ["DONOR_MATCHING", "PARTIAL_FULFILLMENT"]}
            })
            async for req in active_requests_cursor:
                h_id = req.get("hospital_id")
                h_user = await db.users.find_one({"_id": ObjectId(h_id)}) if h_id else None
                h_loc = (h_user.get("location") if h_user else None) or req.get("location") or {}
                await create_donor_requests_for_blood_request(
                    request_id=str(req["_id"]),
                    hospital_id=str(h_id) if h_id else "",
                    blood_group=req.get("blood_group", ""),
                    hospital_location=h_loc,
                )
        except Exception:
            pass

    return {
        "message": "Availability updated successfully",
        "availability": data.availability,
    }