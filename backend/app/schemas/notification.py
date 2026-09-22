from pydantic import BaseModel, Field
from datetime import datetime
from typing import Any


class TokenRegisterRequest(BaseModel):
    token: str = Field(..., min_length=1, description="FCM device registration token")
    platform: str = Field("web", description="Device platform (e.g. web, android, ios)")


class TokenRemoveRequest(BaseModel):
    token: str = Field(..., min_length=1, description="FCM device registration token to remove")


class NotificationResponse(BaseModel):
    id: str
    type: str
    title: str
    message: str
    data: dict[str, Any] = Field(default_factory=dict)
    read: bool = False
    sent: bool = True
    created_at: datetime


class NotificationListResponse(BaseModel):
    notifications: list[NotificationResponse]
    unread_count: int