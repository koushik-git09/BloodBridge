from fastapi import APIRouter, Depends, HTTPException

from app.dependencies.auth import require_role

from app.schemas.blood_bank_reservation import (
    BloodBankReservationResponse,
    BloodBankReservationUpdate,
)

from app.services.blood_bank_reservation_service import (
    get_blood_bank_reservations,
    respond_to_reservation,
)


router = APIRouter(
    prefix="/api/blood-bank/reservations",
    tags=["Blood Bank Reservations"],
)


@router.get(
    "",
    response_model=list[BloodBankReservationResponse],
)
async def get_my_reservations(
    current_user=Depends(require_role("BLOOD_BANK")),
):
    """
    Get reservation requests sent to the logged-in blood bank.
    """

    return await get_blood_bank_reservations(
        current_user["id"]
    )


@router.patch(
    "/{reservation_id}",
    response_model=BloodBankReservationResponse,
)
async def respond_reservation(
    reservation_id: str,
    response_data: BloodBankReservationUpdate,
    current_user=Depends(require_role("BLOOD_BANK")),
):
    """
    Respond to a blood reservation request.
    """

    reservation, error = await respond_to_reservation(
        reservation_id=reservation_id,
        blood_bank_id=current_user["id"],
        action=response_data.action,
        units_confirmed=response_data.units_confirmed,
    )

    if error == "NOT_FOUND":
        raise HTTPException(
            status_code=404,
            detail="Reservation not found",
        )

    if error == "FORBIDDEN":
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to respond to this reservation",
        )

    if error == "ALREADY_RESPONDED":
        raise HTTPException(
            status_code=400,
            detail="This reservation has already been responded to",
        )

    if error == "INVALID_CONFIRM":
        raise HTTPException(
            status_code=400,
            detail="For CONFIRM, units_confirmed must equal units_requested",
        )

    if error == "INVALID_PARTIAL":
        raise HTTPException(
            status_code=400,
            detail="For PARTIAL, units_confirmed must be greater than 0 and less than units_requested",
        )

    if error == "INVALID_ACTION":
        raise HTTPException(
            status_code=400,
            detail="Invalid reservation action",
        )

    return reservation