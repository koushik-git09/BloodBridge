from fastapi import APIRouter, Depends

from app.dependencies.auth import require_role

from app.services.donation_service import (
    get_donor_donation_history,
    get_donor_statistics,
)


router = APIRouter(
    prefix="/api/donors/me",
    tags=["Donor"],
)


@router.get(
    "/donations",
)
async def get_my_donations(
    current_user=Depends(
        require_role("DONOR")
    ),
):
    return await get_donor_donation_history(
        current_user["id"]
    )


@router.get(
    "/statistics",
)
async def get_my_statistics(
    current_user=Depends(
        require_role("DONOR")
    ),
):
    return await get_donor_statistics(
        current_user["id"]
    )