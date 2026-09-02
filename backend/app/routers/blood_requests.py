from fastapi import APIRouter, Depends, HTTPException, status

from app.schemas.blood_request import (
    BloodRequestCreate,
    BloodRequestResponse,
)

from app.services.request_service import (
    create_blood_request,
    get_hospital_requests,
    get_request_by_id,
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