from pydantic import BaseModel, EmailStr
from typing import Literal

from app.schemas.common import Location


class RegisterRequest(BaseModel):

    name: str

    email: EmailStr

    password: str

    phone: str

    role: Literal[
        "HOSPITAL",
        "BLOOD_BANK",
        "DONOR"
    ]

    location: Location

    # DONOR fields
    bloodGroup: str | None = None

    # HOSPITAL fields
    hospitalName: str | None = None


class LoginRequest(BaseModel):

    email: EmailStr

    password: str


class TokenResponse(BaseModel):

    access_token: str

    token_type: str = "bearer"


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class GenericMessageResponse(BaseModel):
    message: str