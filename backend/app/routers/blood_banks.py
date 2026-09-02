from fastapi import APIRouter, Depends, HTTPException, status

from app.schemas.blood_bank import (
    InventoryUpdate,
    InventoryResponse,
)

from app.services.blood_bank_service import (
    get_my_inventory,
    update_inventory,
)

from app.dependencies.auth import require_role


router = APIRouter(
    prefix="/api/blood-banks",
    tags=["Blood Banks"],
)


@router.get(
    "/me/inventory",
    response_model=InventoryResponse,
)
async def get_inventory(
    current_user=Depends(require_role("BLOOD_BANK")),
):

    inventory = await get_my_inventory(
        current_user["id"]
    )

    if not inventory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blood bank not found",
        )

    return inventory


@router.put(
    "/me/inventory",
    response_model=InventoryResponse,
)
async def update_blood_bank_inventory(
    inventory_data: InventoryUpdate,
    current_user=Depends(require_role("BLOOD_BANK")),
):

    inventory = await update_inventory(
        current_user["id"],
        inventory_data,
    )

    if not inventory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blood bank not found",
        )

    return inventory