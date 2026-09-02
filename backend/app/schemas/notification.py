from pydantic import BaseModel
from datetime import datetime


class NotificationResponse(BaseModel):

    id: str

    request_id: str | None = None

    type: str

    title: str

    message: str

    read: bool

    created_at: datetime