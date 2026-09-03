from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


BloodGroup = Literal[
    "A+",
    "A-",
    "B+",
    "B-",
    "AB+",
    "AB-",
    "O+",
    "O-",
]


class BloodRequestCreate(BaseModel):
    patient_reference: str

    blood_group: BloodGroup

    units_required: int = Field(
        gt=0,
        le=20,
    )

    urgency: Literal[
        "NORMAL",
        "URGENT",
        "CRITICAL",
    ]

    notes: str | None = None


class DonorMatchResponse(BaseModel):
    donor_id: str

    name: str

    blood_group: str

    availability: str

    distance: float

    match_score: float

    trust_score: float

    donation_count: int

    status: str


class BloodRequestResponse(BaseModel):
    id: str

    hospital_id: str

    patient_reference: str

    blood_group: str

    units_required: int

    urgency: str

    status: str

    blood_bank_units: int

    donor_units: int

    remaining_units: int

    created_at: datetime

    donors: list[DonorMatchResponse] = Field(default_factory=list)
