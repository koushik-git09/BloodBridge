from pydantic import BaseModel, EmailStr
from typing import Literal
from datetime import datetime

from app.schemas.common import Location


class HospitalRegistrationResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    phone: str
    hospital_name: str
    location: Location
    status: Literal["PENDING", "APPROVED", "REJECTED"]
    verified: bool
    created_at: datetime | str | None = None
    approved_at: datetime | str | None = None
    approved_by: str | None = None
    rejected_at: datetime | str | None = None
    rejected_by: str | None = None


class HospitalStatusUpdateResponse(BaseModel):
    message: str
    hospital_id: str
    status: Literal["PENDING", "APPROVED", "REJECTED"]
    verified: bool
