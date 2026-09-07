from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Literal
from bson import ObjectId

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

    result = await db.users.update_one(
        {
            "_id": donor_object_id,
            "role": "DONOR",
        },
        {
            "$set": {
                "availability": data.availability,
            }
        },
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Donor not found",
        )

    return {
        "message": "Availability updated successfully",
        "availability": data.availability,
    }