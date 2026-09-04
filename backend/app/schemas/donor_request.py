from datetime import datetime
from pydantic import BaseModel
from typing import Literal


class DonorRequestResponse(BaseModel):

    id: str

    request_id: str

    donor_id: str

    hospital_id: str

    hospital_name: str | None = None

    patient_reference: str | None = None

    blood_group: str

    units_required: int | None = None

    urgency: str | None = None

    distance: float

    match_score: float

    trust_score: float

    status: str

    created_at: datetime

    responded_at: datetime | None = None


class DonorRequestUpdate(BaseModel):

    action: Literal[
        "ACCEPT",
        "DECLINE",
    ]