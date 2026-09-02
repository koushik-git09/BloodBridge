from pydantic import BaseModel, Field
from typing import Literal
from datetime import datetime


BloodGroup = Literal[
    "A+", "A-",
    "B+", "B-",
    "AB+", "AB-",
    "O+", "O-"
]

Urgency = Literal[
    "NORMAL",
    "URGENT",
    "CRITICAL"
]

RequestStatus = Literal[
    "VERIFIED",
    "CHECKING_BLOOD_BANK",
    "PARTIAL_FULFILLMENT",
    "DONOR_MATCHING",
    "FULFILLED",
    "CONFIRMED"
]


class BloodRequestCreate(BaseModel):

    patient_reference: str

    blood_group: BloodGroup

    units_required: int = Field(
        gt=0,
        le=20
    )

    urgency: Urgency

    notes: str | None = None


class BloodRequestResponse(BaseModel):

    id: str

    hospital_id: str

    hospital_name: str | None = None

    patient_reference: str

    blood_group: BloodGroup

    units_required: int

    urgency: Urgency

    status: RequestStatus

    blood_bank_units: int = 0

    donor_units: int = 0

    remaining_units: int = 0

    notes: str | None = None

    created_at: datetime