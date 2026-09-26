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
    donor_request_id: str | None = None
    name: str
    blood_group: str
    availability: str
    distance: float
    match_score: float
    trust_score: float
    donation_count: int
    last_donation: datetime | None = None
    status: str
    phone: str | None = None
    address: str | None = None
    responded_at: datetime | None = None


class BloodBankReservationSummary(BaseModel):
    id: str
    blood_bank_id: str
    blood_bank_name: str | None = None
    blood_bank_address: str | None = None
    blood_bank_phone: str | None = None
    blood_group: str
    units_requested: int
    units_confirmed: int = 0
    status: str
    distance: float


class BloodRequestResponse(BaseModel):
    id: str
    hospital_id: str
    hospital_name: str | None = None
    hospital_address: str | None = None
    patient_reference: str
    blood_group: str
    units_required: int
    urgency: str
    status: str
    blood_bank_units: int
    donor_units: int
    remaining_units: int
    notes: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    fulfilled_at: datetime | None = None
    donors: list[DonorMatchResponse] = Field(default_factory=list)
    blood_banks: list[BloodBankReservationSummary] = Field(default_factory=list)


