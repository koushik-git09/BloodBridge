from pydantic import BaseModel, EmailStr, Field
from typing import Literal

from app.schemas.common import Location


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    phone: str = Field(..., min_length=10, max_length=20)

    role: Literal["HOSPITAL", "BLOOD_BANK", "DONOR"]

    location: Location

    # Donor-specific fields
    bloodGroup: Literal[
        "A+", "A-",
        "B+", "B-",
        "AB+", "AB-",
        "O+", "O-"
    ] | None = None

    # Hospital-specific field
    hospitalName: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    accessToken: str
    tokenType: str = "bearer"