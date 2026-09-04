from fastapi import APIRouter, Depends, HTTPException, status

from app.schemas.blood_request import (
    BloodRequestCreate,
    BloodRequestResponse,
)
from app.services.request_service import (
    create_blood_request,
    get_hospital_requests,
    get_request_by_id,
    confirm_donation as confirm_donation_service,
)

from app.dependencies.auth import require_role


router = APIRouter(
    prefix="/api/requests",
    tags=["Blood Requests"],
)


@router.post(
    "",
    response_model=BloodRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_request(
    request_data: BloodRequestCreate,
    current_user=Depends(require_role("HOSPITAL")),
):

    return await create_blood_request(
        request_data,
        current_user,
    )


@router.get(
    "",
    response_model=list[BloodRequestResponse],
)
async def get_my_requests(
    current_user=Depends(require_role("HOSPITAL")),
):

    return await get_hospital_requests(
        current_user["id"]
    )

@router.get(
    "/{request_id}",
    response_model=BloodRequestResponse,
)
async def get_request(
    request_id: str,
    current_user=Depends(require_role("HOSPITAL")),
):

    request = await get_request_by_id(request_id)

    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blood request not found",
        )

    # Hospital can only view its own request
    if request["hospital_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this request",
        )

    return request
@router.patch(
    "/{request_id}/donors/{donor_request_id}/confirm-donation",
    response_model=BloodRequestResponse,
)
async def confirm_donation(
    request_id: str,
    donor_request_id: str,
    current_user=Depends(
        require_role("HOSPITAL")
    ),
):
    """
    Hospital confirms that an accepted donor has
    completed the blood donation.
    """

    donation, error = await confirm_donation_service(
        donor_request_id=donor_request_id,
        request_id=request_id,
        hospital_id=current_user["id"],
    )

    if error == "NOT_FOUND":
        raise HTTPException(
            status_code=404,
            detail="Donor request not found",
        )

    if error == "FORBIDDEN":
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to confirm this donation",
        )

    if error == "INVALID_STATUS":
        raise HTTPException(
            status_code=400,
            detail=(
                "Donation can only be confirmed "
                "after the donor accepts the request"
            ),
        )

    if error == "ALREADY_RESPONDED":
        raise HTTPException(
            status_code=400,
            detail="This donation has already been confirmed",
        )

    if error == "REQUEST_NOT_FOUND":
        raise HTTPException(
            status_code=404,
            detail="Blood request not found",
        )

    return donation
