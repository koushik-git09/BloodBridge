from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.database.mongodb import db
from app.dependencies.auth import require_admin
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.admin import (
    HospitalRegistrationResponse,
    HospitalStatusUpdateResponse,
)
from app.services.auth_service import admin_login_user

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin"],
)


def _serialize_hospital(doc: dict) -> dict:
    raw_status = doc.get("status")
    verified = doc.get("verified", False)

    if not raw_status:
        resolved_status = "APPROVED" if verified else "PENDING"
    else:
        resolved_status = raw_status

    loc = doc.get("location") or {}

    return {
        "id": str(doc["_id"]),
        "name": doc.get("name", ""),
        "email": doc.get("email", ""),
        "phone": doc.get("phone", ""),
        "hospital_name": doc.get("hospitalName") or doc.get("name", "Unknown Hospital"),
        "location": {
            "latitude": loc.get("latitude", 0.0),
            "longitude": loc.get("longitude", 0.0),
            "address": loc.get("address", "Address unavailable"),
        },
        "status": resolved_status,
        "verified": verified,
        "created_at": doc.get("createdAt"),
        "approved_at": doc.get("approvedAt"),
        "approved_by": doc.get("approvedBy"),
        "rejected_at": doc.get("rejectedAt"),
        "rejected_by": doc.get("rejectedBy"),
    }


@router.post(
    "/login",
    response_model=TokenResponse,
)
async def admin_login(
    credentials: LoginRequest,
):
    """
    Authenticate an administrator account. Rejects normal role credentials.
    """
    token, error, status_code = await admin_login_user(
        credentials.email,
        credentials.password,
    )

    if error or not token:
        raise HTTPException(
            status_code=status_code or status.HTTP_401_UNAUTHORIZED,
            detail=error or "Invalid email or password",
        )

    return token


@router.get(
    "/hospital-registrations",
    response_model=list[HospitalRegistrationResponse],
)
async def list_hospital_registrations(
    status_filter: str | None = Query(None, alias="status"),
    current_admin=Depends(require_admin),
):
    """
    List hospital registrations with optional status filter (PENDING, APPROVED, REJECTED, ALL).
    Only accessible by ADMIN.
    """
    query: dict = {"role": "HOSPITAL"}

    if status_filter and status_filter.upper() != "ALL":
        filter_upper = status_filter.upper()
        if filter_upper == "PENDING":
            query["$or"] = [
                {"status": "PENDING"},
                {"status": {"$exists": False}, "verified": False},
            ]
        elif filter_upper == "APPROVED":
            query["$or"] = [
                {"status": "APPROVED"},
                {"status": {"$exists": False}, "verified": True},
            ]
        elif filter_upper == "REJECTED":
            query["status"] = "REJECTED"

    cursor = db.users.find(query).sort("createdAt", -1)
    hospitals = await cursor.to_list(length=200)

    return [_serialize_hospital(h) for h in hospitals]


@router.get(
    "/hospital-registrations/{hospital_id}",
    response_model=HospitalRegistrationResponse,
)
async def get_hospital_registration(
    hospital_id: str,
    current_admin=Depends(require_admin),
):
    """
    Get full registration details for a single hospital.
    Excludes password, passwordHash, and sensitive credentials.
    """
    try:
        obj_id = ObjectId(hospital_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid hospital ID",
        )

    hospital = await db.users.find_one({"_id": obj_id, "role": "HOSPITAL"})
    if not hospital:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hospital registration not found",
        )

    return _serialize_hospital(hospital)


@router.patch(
    "/hospital-registrations/{hospital_id}/approve",
    response_model=HospitalStatusUpdateResponse,
)
async def approve_hospital(
    hospital_id: str,
    current_admin=Depends(require_admin),
):
    """
    Approve a pending hospital registration.
    """
    try:
        obj_id = ObjectId(hospital_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid hospital ID",
        )

    hospital = await db.users.find_one({"_id": obj_id, "role": "HOSPITAL"})
    if not hospital:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hospital registration not found",
        )

    current_status = hospital.get("status", "PENDING" if not hospital.get("verified") else "APPROVED")
    if current_status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only PENDING hospital registrations can be approved. Current status: {current_status}",
        )

    now = datetime.now(timezone.utc)
    await db.users.update_one(
        {"_id": obj_id},
        {
            "$set": {
                "status": "APPROVED",
                "verified": True,
                "approvedAt": now,
                "approvedBy": str(current_admin.get("id")),
                "updatedAt": now,
            }
        },
    )

    return {
        "message": "Hospital registration approved successfully",
        "hospital_id": hospital_id,
        "status": "APPROVED",
        "verified": True,
    }


@router.patch(
    "/hospital-registrations/{hospital_id}/reject",
    response_model=HospitalStatusUpdateResponse,
)
async def reject_hospital(
    hospital_id: str,
    current_admin=Depends(require_admin),
):
    """
    Reject a pending hospital registration.
    """
    try:
        obj_id = ObjectId(hospital_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid hospital ID",
        )

    hospital = await db.users.find_one({"_id": obj_id, "role": "HOSPITAL"})
    if not hospital:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hospital registration not found",
        )

    current_status = hospital.get("status", "PENDING" if not hospital.get("verified") else "APPROVED")
    if current_status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only PENDING hospital registrations can be rejected. Current status: {current_status}",
        )

    now = datetime.now(timezone.utc)
    await db.users.update_one(
        {"_id": obj_id},
        {
            "$set": {
                "status": "REJECTED",
                "verified": False,
                "rejectedAt": now,
                "rejectedBy": str(current_admin.get("id")),
                "updatedAt": now,
            }
        },
    )

    return {
        "message": "Hospital registration rejected",
        "hospital_id": hospital_id,
        "status": "REJECTED",
        "verified": False,
    }
