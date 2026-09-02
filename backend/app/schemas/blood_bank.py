from pydantic import BaseModel, Field
from typing import Literal
from datetime import datetime


BloodGroup = Literal[
    "A+", "A-",
    "B+", "B-",
    "AB+", "AB-",
    "O+", "O-"
]


class InventoryUpdate(BaseModel):

    inventory: dict[BloodGroup, int]


class InventoryResponse(BaseModel):

    blood_bank_id: str

    name: str

    inventory: dict[str, int]

    last_inventory_update: datetime | None = None

    status: Literal["ACTIVE", "INACTIVE"]