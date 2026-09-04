from datetime import datetime
from pydantic import BaseModel


class DonationResponse(BaseModel):

    id: str

    donor_id: str

    request_id: str

    hospital_id: str

    hospital_name: str | None = None

    blood_group: str

    units: int

    donated_at: datetime

    status: str