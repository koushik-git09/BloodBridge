from fastapi import APIRouter, Depends, HTTPException

from app.dependencies.auth import require_role

from app.schemas.donor_request import (
    DonorRequestResponse,
    DonorRequestUpdate,
)

from app.services.donor_request_service import (
    get_donor_requests_for_donor,
    respond_to_donor_request,
)


router = APIRouter(
    prefix="/api/donor-requests",
    tags=["Donor Requests"],
)


@router.get(
    "",
    response_model=list[DonorRequestResponse],
)
async def get_my_donor_requests(
    current_user=Depends(
        require_role("DONOR")
    ),
):

    return await get_donor_requests_for_donor(
        current_user["id"]
    )


@router.patch(
    "/{donor_request_id}",
    response_model=DonorRequestResponse,
)
async def respond_to_request(
    donor_request_id: str,
    response_data: DonorRequestUpdate,
    current_user=Depends(
        require_role("DONOR")
    ),
):

    request, error = await respond_to_donor_request(
        donor_request_id=donor_request_id,
        donor_id=current_user["id"],
        action=response_data.action,
    )

    if error == "NOT_FOUND":
        raise HTTPException(
            status_code=404,
            detail="Donor request not found",
        )

    if error == "FORBIDDEN":
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to respond to this request",
        )

    if error == "ALREADY_RESPONDED":
        raise HTTPException(
            status_code=400,
            detail="This request has already been responded to",
        )

    if error == "INVALID_ACTION":
        raise HTTPException(
            status_code=400,
            detail="Invalid donor response",
        )

    return request