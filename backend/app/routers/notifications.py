from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId

from app.dependencies.auth import get_current_user
from app.database.mongodb import db
from app.schemas.notification import (
    TokenRegisterRequest,
    TokenRemoveRequest,
    NotificationResponse,
)
from app.services.notification_service import (
    register_device_token,
    remove_device_token,
)

router = APIRouter(
    prefix="/api/notifications",
    tags=["Notifications"],
)


@router.post("/register-token", status_code=status.HTTP_200_OK)
async def register_token(
    payload: TokenRegisterRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Associate an FCM device token with the currently authenticated user.
    """
    user_id = current_user["id"]
    success = await register_device_token(
        user_id=user_id,
        token=payload.token,
        platform=payload.platform,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to register device token",
        )

    return {
        "status": "success",
        "message": "Device token registered successfully",
        "platform": payload.platform,
    }


@router.delete("/register-token", status_code=status.HTTP_200_OK)
async def unregister_token(
    payload: TokenRemoveRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Remove an FCM device token when a user signs out or disables notifications.
    """
    user_id = current_user["id"]
    await remove_device_token(
        user_id=user_id,
        token=payload.token,
    )

    return {
        "status": "success",
        "message": "Device token removed successfully",
    }


@router.get("", response_model=list[NotificationResponse])
async def get_my_notifications(
    limit: int = 50,
    current_user: dict = Depends(get_current_user),
):
    """
    Retrieve notification records belonging exclusively to the authenticated user.
    """
    user_id = current_user["id"]
    cursor = (
        db.notifications.find({"user_id": user_id})
        .sort("created_at", -1)
        .limit(min(limit, 100))
    )

    notifications = []
    async for doc in cursor:
        notifications.append(
            NotificationResponse(
                id=str(doc["_id"]),
                type=doc.get("type", "GENERAL"),
                title=doc.get("title", ""),
                message=doc.get("message", ""),
                data=doc.get("data", {}),
                read=doc.get("read", False),
                sent=doc.get("sent", True),
                created_at=doc.get("created_at"),
            )
        )

    return notifications


@router.patch("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Mark a single notification as read. Enforces user ownership.
    """
    user_id = current_user["id"]

    try:
        oid = ObjectId(notification_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid notification ID",
        )

    result = await db.notifications.update_one(
        {"_id": oid, "user_id": user_id},
        {"$set": {"read": True}},
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    return {"status": "success", "id": notification_id}


@router.patch("/read-all")
async def mark_all_notifications_read(
    current_user: dict = Depends(get_current_user),
):
    """
    Mark all unread notifications as read for the authenticated user.
    """
    user_id = current_user["id"]

    result = await db.notifications.update_many(
        {"user_id": user_id, "read": False},
        {"$set": {"read": True}},
    )

    return {
        "status": "success",
        "marked_read_count": result.modified_count,
    }
