import json
import logging
from pathlib import Path
from datetime import datetime, timezone
from bson import ObjectId
import firebase_admin
from firebase_admin import credentials, messaging

from app.core.config import FIREBASE_CREDENTIALS_FULL_PATH, FIREBASE_CREDENTIALS_JSON
from app.database.mongodb import db

logger = logging.getLogger("bloodbridge.notifications")

_firebase_initialized = False


def init_firebase_admin() -> bool:
    """
    Safely initialize the Firebase Admin SDK once.
    Fails gracefully if credentials are not found or invalid.
    """
    global _firebase_initialized

    if _firebase_initialized:
        return True

    # If already initialized by another module or process
    if firebase_admin._apps:
        _firebase_initialized = True
        return True

    try:
        # 1. Try initializing from FIREBASE_CREDENTIALS_JSON environment variable (ideal for cloud platforms)
        if FIREBASE_CREDENTIALS_JSON:
            try:
                cred_dict = json.loads(FIREBASE_CREDENTIALS_JSON)
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred)
                _firebase_initialized = True
                logger.info("[FCM] Firebase Admin SDK initialized successfully from environment variable.")
                return True
            except Exception as e:
                logger.error(f"[FCM] Failed to initialize Firebase from FIREBASE_CREDENTIALS_JSON: {e}")

        # 2. Try initializing from file paths (supports local credentials/, Render root, and /etc/secrets/)
        candidate_paths = [
            FIREBASE_CREDENTIALS_FULL_PATH,
            Path("firebase-service-account.json"),
            Path("/etc/secrets/firebase-service-account.json"),
        ]

        found_path = None
        for p in candidate_paths:
            if p.exists():
                found_path = p
                break

        if not found_path:
            logger.warning(
                f"[FCM] Firebase credentials file not found (checked: {[str(p) for p in candidate_paths]}). Push notifications will be disabled."
            )
            return False

        cred = credentials.Certificate(str(found_path))
        firebase_admin.initialize_app(cred)
        _firebase_initialized = True
        logger.info(f"[FCM] Firebase Admin SDK initialized successfully from {found_path}.")
        return True

    except Exception as e:
        logger.error(f"[FCM] Failed to initialize Firebase Admin SDK: {e}")
        return False



# Attempt startup initialization
init_firebase_admin()


# =========================================================
# TOKEN MANAGEMENT
# =========================================================

async def register_device_token(user_id: str, token: str, platform: str = "web") -> bool:
    """
    Associate an FCM device token with the authenticated user.
    Prevents duplicates and updates last_seen_at.
    """
    if not token or not user_id:
        return False

    now = datetime.now(timezone.utc)

    try:
        user_oid = ObjectId(user_id)
    except Exception:
        return False

    user = await db.users.find_one({"_id": user_oid})
    if not user:
        return False

    tokens = user.get("fcm_tokens", [])
    token_exists = False

    for t in tokens:
        if t.get("token") == token:
            t["last_seen_at"] = now
            t["platform"] = platform
            token_exists = True
            break

    if not token_exists:
        tokens.append({
            "token": token,
            "platform": platform,
            "created_at": now,
            "last_seen_at": now,
        })

    await db.users.update_one(
        {"_id": user_oid},
        {"$set": {"fcm_tokens": tokens}},
    )

    logger.info(f"[FCM] Registered device token for user {user_id} ({platform})")
    return True


async def remove_device_token(user_id: str, token: str) -> bool:
    """
    Remove an FCM device token for the authenticated user.
    """
    if not token or not user_id:
        return False

    try:
        user_oid = ObjectId(user_id)
    except Exception:
        return False

    result = await db.users.update_one(
        {"_id": user_oid},
        {"$pull": {"fcm_tokens": {"token": token}}},
    )

    logger.info(f"[FCM] Removed device token for user {user_id}")
    return result.modified_count > 0


async def prune_invalid_token(user_id: str, token: str):
    """Remove expired or unregistered token from user document."""
    try:
        user_oid = ObjectId(user_id)
        await db.users.update_one(
            {"_id": user_oid},
            {"$pull": {"fcm_tokens": {"token": token}}},
        )
        logger.info(f"[FCM] Pruned invalid token for user {user_id}")
    except Exception as e:
        logger.warning(f"[FCM] Failed to prune token: {e}")


# =========================================================
# NOTIFICATION RECORDS (MONGODB)
# =========================================================

async def create_notification_record(
    user_id: str,
    notification_type: str,
    title: str,
    message: str,
    data: dict | None = None,
    sent: bool = True,
    dedup_key: str | None = None,
) -> dict | None:
    """
    Persist an in-app notification in the notifications collection.
    If dedup_key is provided and already exists for this user, returns existing.
    """
    clean_data = data or {}

    if dedup_key:
        existing = await db.notifications.find_one({
            "user_id": user_id,
            "dedup_key": dedup_key,
        })
        if existing:
            return existing

    record = {
        "user_id": user_id,
        "type": notification_type,
        "title": title,
        "message": message,
        "data": clean_data,
        "read": False,
        "sent": sent,
        "created_at": datetime.now(timezone.utc),
    }

    if dedup_key:
        record["dedup_key"] = dedup_key

    result = await db.notifications.insert_one(record)
    record["_id"] = result.inserted_id
    return record


# =========================================================
# FCM DISPATCH ENGINE
# =========================================================

def _prepare_string_data(data: dict | None) -> dict[str, str]:
    """Ensure all FCM data payload values are strings."""
    if not data:
        return {}
    str_data = {}
    for k, v in data.items():
        if v is None:
            str_data[k] = ""
        elif isinstance(v, (int, float, bool)):
            str_data[k] = str(v)
        else:
            str_data[k] = str(v)
    return str_data


async def send_fcm_notification(
    user_id: str,
    tokens: list[str],
    title: str,
    message: str,
    data: dict | None = None,
    urgency: str = "NORMAL",
) -> int:
    """
    Send push notification via Firebase Admin to specified device tokens.
    Configures priority, sounds, and emergency payload settings.
    Prunes stale/unregistered tokens.
    Returns number of successful deliveries.
    """
    if not tokens or not init_firebase_admin():
        return 0

    is_emergency = urgency in ["CRITICAL", "URGENT"]
    fcm_data = _prepare_string_data(data)
    fcm_data["title"] = title
    fcm_data["body"] = message
    fcm_data["urgency"] = urgency

    webpush_headers = {
        "Urgency": "high" if is_emergency else "normal",
        "TTL": "86400",
    }

    webpush_notification = messaging.WebpushNotification(
        title=title,
        body=message,
        icon="/bloodbridge-logo.png",
        badge="/bloodbridge-logo.png",
        tag=fcm_data.get("request_id", "bloodbridge-alert"),
        renotify=True,
    )

    webpush_config = messaging.WebpushConfig(
        headers=webpush_headers,
        notification=webpush_notification,
        data=fcm_data,
    )

    android_config = messaging.AndroidConfig(
        priority="high" if is_emergency else "normal",
        notification=messaging.AndroidNotification(
            title=title,
            body=message,
            sound="default",
            priority="max" if is_emergency else "high",
            channel_id="bloodbridge_emergency" if is_emergency else "bloodbridge_general",
        ),
        data=fcm_data,
    )

    apns_config = messaging.APNSConfig(
        payload=messaging.APNSPayload(
            aps=messaging.Aps(
                alert=messaging.ApsAlert(title=title, body=message),
                sound="default",
                badge=1,
            )
        )
    )

    standard_notification = messaging.Notification(
        title=title,
        body=message,
    )

    multicast_message = messaging.MulticastMessage(
        tokens=tokens,
        notification=standard_notification,
        data=fcm_data,
        webpush=webpush_config,
        android=android_config,
        apns=apns_config,
    )

    success_count = 0
    try:
        response = messaging.send_each_for_multicast(multicast_message)
        success_count = response.success_count

        if response.failure_count > 0:
            for idx, resp in enumerate(response.responses):
                if not resp.success:
                    err = resp.exception
                    token = tokens[idx]
                    logger.warning(f"[FCM] Failed delivery to token {token[:12]}...: {err}")
                    # If unregistered or invalid, prune token
                    if isinstance(err, (messaging.UnregisteredError, messaging.SenderIdMismatchError)):
                        await prune_invalid_token(user_id, token)

        logger.info(f"[FCM] Delivered {success_count}/{len(tokens)} messages to user {user_id}")
    except Exception as e:
        logger.error(f"[FCM] Error sending multicast message to user {user_id}: {e}")

    return success_count


# =========================================================
# CENTRAL NOTIFICATION API
# =========================================================

async def send_notification_to_user(
    user_id: str,
    title: str,
    message: str,
    notification_type: str,
    data: dict | None = None,
    urgency: str = "NORMAL",
    dedup_key: str | None = None,
) -> dict:
    """
    Central function to notify a user:
    1. Checks duplicate prevention if dedup_key is supplied.
    2. Persists notification record in MongoDB.
    3. Resolves user's active FCM device tokens.
    4. Dispatches push notification via Firebase Admin.
    """
    # 1. Duplicate check & Record creation
    record = await create_notification_record(
        user_id=user_id,
        notification_type=notification_type,
        title=title,
        message=message,
        data=data,
        sent=True,
        dedup_key=dedup_key,
    )

    # If duplicate was detected, don't re-send push
    if record and record.get("dedup_key") == dedup_key and record.get("_id") and (
        datetime.now(timezone.utc) - record.get("created_at", datetime.now(timezone.utc))
    ).total_seconds() > 5:
        return record

    # 2. Lookup user device tokens
    try:
        user_oid = ObjectId(user_id)
        user = await db.users.find_one({"_id": user_oid})
    except Exception:
        user = None

    tokens = [t["token"] for t in (user.get("fcm_tokens", []) if user else []) if t.get("token")]

    # 3. Dispatch FCM Push
    if tokens:
        try:
            delivered = await send_fcm_notification(
                user_id=user_id,
                tokens=tokens,
                title=title,
                message=message,
                data=data,
                urgency=urgency,
            )
            if delivered == 0:
                await db.notifications.update_one(
                    {"_id": record["_id"]},
                    {"$set": {"sent": False}},
                )
        except Exception as e:
            logger.warning(f"[FCM] Push dispatch failed for user {user_id}: {e}")
            await db.notifications.update_one(
                {"_id": record["_id"]},
                {"$set": {"sent": False}},
            )

    return record


async def send_notification_to_users(
    user_ids: list[str],
    title: str,
    message: str,
    notification_type: str,
    data: dict | None = None,
    urgency: str = "NORMAL",
    dedup_key_prefix: str | None = None,
) -> list[dict]:
    """
    Batch send notifications to multiple users.
    """
    results = []
    for uid in user_ids:
        dedup_key = f"{dedup_key_prefix}:{uid}" if dedup_key_prefix else None
        res = await send_notification_to_user(
            user_id=uid,
            title=title,
            message=message,
            notification_type=notification_type,
            data=data,
            urgency=urgency,
            dedup_key=dedup_key,
        )
        if res:
            results.append(res)
    return results
