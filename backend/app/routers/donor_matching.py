from fastapi import APIRouter, Depends

from app.dependencies.auth import require_role

from app.database.mongodb import db

from app.services.donor_matching_service import (
    find_matching_donors,
)


router = APIRouter(
    prefix="/api/donor-matching",
    tags=["Donor Matching"],
)


@router.get(
    "/request/{request_id}",
)
@router.post(
    "/request/{request_id}",
)
async def get_matching_donors(
    request_id: str,
    current_user=Depends(
        require_role("HOSPITAL", "BLOOD_BANK")
    ),
):
    """
    Finds compatible donors for a hospital blood request.
    Accessible to the owning hospital or to blood banks holding a reservation for this request.
    """

    from bson import ObjectId
    from fastapi import HTTPException

    try:
        request = await db.blood_requests.find_one({
            "_id": ObjectId(request_id)
        })
    except Exception:
        request = None

    if not request:
        return {
            "request_id": request_id,
            "donors": [],
        }

    # -----------------------------------------------------
    # Security check
    # -----------------------------------------------------

    if current_user["role"] == "HOSPITAL" and request["hospital_id"] != current_user["id"]:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to access this request",
        )

    if current_user["role"] == "BLOOD_BANK":
        reservation = await db.blood_bank_reservations.find_one({
            "request_id": request_id,
            "blood_bank_id": current_user["id"],
        })
        if not reservation:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to access this request",
            )

    hospital = await db.users.find_one({
        "_id": ObjectId(request["hospital_id"]),
        "role": "HOSPITAL",
    })

    if not hospital:
        return {
            "request_id": request_id,
            "donors": [],
        }

    location = hospital.get("location")

    if not location:
        return {
            "request_id": request_id,
            "donors": [],
        }

    donors = await find_matching_donors(
        request_id=request_id,
        blood_group=request["blood_group"],
        hospital_location=location,
        limit=10,
    )

    return {
        "request_id": request_id,
        "blood_group": request["blood_group"],
        "donor_count": len(donors),
        "donors": donors,
    }