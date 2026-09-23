from pydantic import BaseModel, Field
from typing import Literal
from datetime import datetime


class BloodBankReservationResponse(BaseModel):

    id: str

    request_id: str

    blood_bank_id: str

    hospital_id: str

    hospital_name: str | None = None
    hospital_address: str | None = None
    blood_bank_name: str | None = None
    blood_bank_address: str | None = None

    urgency: str | None = None

    blood_group: str

    units_requested: int

    units_confirmed: int = 0

    status: Literal[
        "PENDING",
        "CONFIRMED",
        "PARTIAL",
        "REJECTED"
    ]

    distance: float

    created_at: datetime

    responded_at: datetime | None = None


class BloodBankReservationUpdate(BaseModel):

    action: Literal[
        "CONFIRM",
        "PARTIAL",
        "REJECT"
    ]

    units_confirmed: int = Field(
        default=0,
        ge=0
    )