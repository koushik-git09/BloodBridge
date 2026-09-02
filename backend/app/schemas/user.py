from pydantic import BaseModel, EmailStr, Field
from typing import Literal
from datetime import datetime, date

from app.schemas.common import Location


class UserBase(BaseModel):
    name: str
    email: EmailStr
    phone: str
    role: Literal["HOSPITAL", "BLOOD_BANK", "DONOR"]
    location: Location


class DonorProfile(BaseModel):
    blood_group: Literal[
        "A+", "A-",
        "B+", "B-",
        "AB+", "AB-",
        "O+", "O-"
    ]

    availability: Literal[
        "AVAILABLE",
        "BUSY",
        "UNAVAILABLE"
    ] = "AVAILABLE"

    last_donation_date: date | None = None

    donation_count: int = 0

    trust_score: float = Field(
        default=50,
        ge=0,
        le=100
    )


class BloodBankProfile(BaseModel):
    inventory: dict[str, int]

    last_inventory_update: datetime | None = None


class HospitalProfile(BaseModel):
    hospital_name: str

    verified: bool = True