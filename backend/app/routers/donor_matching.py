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
        require_role("HOSPITAL")
    ),
):
    """
    Temporary testing endpoint.

    Finds compatible donors for a hospital request.
    """

    from bson import ObjectId

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

    if request["hospital_id"] != current_user["id"]:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=403,
            detail=(
                "You do not have permission "
                "to access this request"
            ),
        )

    hospital = await db.users.find_one({
        "_id": ObjectId(
            current_user["id"]
        ),
        "role": "HOSPITAL",
    })

    if not hospital:
        return {
            "request_id": request_id,
            "donors": [],
        }

    location = hospital.get(
        "location"
    )

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