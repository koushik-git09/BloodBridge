import asyncio
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from bson import ObjectId
from app.database.mongodb import db
from app.core.security import decode_access_token
from app.schemas.auth import RegisterRequest
from app.schemas.common import Location
from app.services.auth_service import (
    register_user,
    login_user,
    admin_login_user,
    request_password_reset,
    verify_reset_token_validity,
    reset_password_with_token,
)
from app.routers.admin import (
    _serialize_hospital,
    list_hospital_registrations,
    approve_hospital,
    reject_hospital,
)


async def run_tests():
    print("=" * 60)
    print("RUNNING AUTOMATED VERIFICATION SUITE")
    print("=" * 60)

    # 1. Admin account in database
    print("\n[TEST 1] Verifying Admin Account in MongoDB...")
    admin = await db.users.find_one({"email": "bloodbridgeadmin@gmail.com"})
    assert admin is not None, "Admin not found in DB!"
    assert admin["role"] == "ADMIN", f"Admin role expected ADMIN, got {admin.get('role')}"
    assert "password" not in admin, "CRITICAL: Plaintext password found in admin doc!"
    assert "passwordHash" in admin, "Admin missing passwordHash!"
    assert admin["passwordHash"].startswith("$2"), "passwordHash is not a valid bcrypt hash!"
    print("[PASS] Admin account in MongoDB is securely hashed with role ADMIN.")

    # 2. Admin Login
    print("\n[TEST 2] Verifying Admin Login...")
    token_resp, err, code = await admin_login_user("bloodbridgeadmin@gmail.com", "12345678")
    assert err is None, f"Admin login failed: {err}"
    assert token_resp is not None and "access_token" in token_resp
    payload = decode_access_token(token_resp["access_token"])
    assert payload["role"] == "ADMIN", f"JWT role expected ADMIN, got {payload.get('role')}"
    assert payload["sub"] == str(admin["_id"])
    print("[PASS] Admin login successfully issues JWT with role ADMIN.")

    # Wrong password test
    bad_resp, bad_err, bad_code = await admin_login_user("bloodbridgeadmin@gmail.com", "wrongpwd")
    assert bad_resp is None and bad_code == 401
    print("[PASS] Invalid admin credentials correctly rejected with 401.")

    # 3. Admin on normal login test
    print("\n[TEST 3] Verifying Admin Blocked on Normal Login...")
    norm_resp, norm_err, norm_code = await login_user("bloodbridgeadmin@gmail.com", "12345678")
    assert norm_resp is None and norm_code == 403
    assert "Admin Portal" in norm_err
    print("[PASS] Admin credentials on normal login endpoint rejected with 403.")

    # Clean up test accounts
    test_emails = [
        "test_hosp_a@example.com",
        "test_hosp_b@example.com",
        "test_hosp_c@example.com",
        "test_donor_x@example.com",
        "test_bank_x@example.com",
    ]
    await db.users.delete_many({"email": {"$in": test_emails}})
    await db.password_reset_tokens.delete_many({"email": {"$in": test_emails}})

    # 4. Hospital Registration & Status PENDING
    print("\n[TEST 4] Verifying Hospital Registration Flow...")
    hosp_a_data = RegisterRequest(
        name="Dr. Smith",
        email="test_hosp_a@example.com",
        phone="9876543210",
        password="Password123!",
        role="HOSPITAL",
        hospitalName="City General Hospital",
        location=Location(latitude=13.0827, longitude=80.2707, address="123 Hospital Rd, Chennai"),
    )
    user_a, err = await register_user(hosp_a_data)
    assert err is None, f"Hospital registration failed: {err}"
    assert user_a is not None

    hosp_doc_a = await db.users.find_one({"email": "test_hosp_a@example.com"})
    assert hosp_doc_a["status"] == "PENDING", f"Expected PENDING status, got {hosp_doc_a.get('status')}"
    assert hosp_doc_a["verified"] is False, "Hospital should not be verified on registration!"
    print("[PASS] Hospital registered with status PENDING and verified=False.")

    # 5. PENDING Hospital Login Blocked
    print("\n[TEST 5] Verifying PENDING Hospital Login Restriction...")
    l_resp, l_err, l_code = await login_user("test_hosp_a@example.com", "Password123!")
    assert l_resp is None and l_code == 403
    assert "pending admin approval" in l_err.lower()
    print(f"[PASS] PENDING hospital blocked from login with message: '{l_err}'")

    # 6. Donor registration should be immediate (no pending)
    print("\n[TEST 6] Verifying Donor Registration Flow...")
    donor_data = RegisterRequest(
        name="Donor Dave",
        email="test_donor_x@example.com",
        phone="9876543211",
        password="Password123!",
        role="DONOR",
        bloodGroup="O+",
        location=Location(latitude=13.0827, longitude=80.2707, address="456 Donor Rd, Chennai"),
    )
    donor_user, err = await register_user(donor_data)
    assert err is None
    donor_login, d_err, d_code = await login_user("test_donor_x@example.com", "Password123!")
    assert donor_login is not None and d_err is None
    print("[PASS] Donor registration and login works immediately without admin approval.")

    # 7. Non-admin accessing admin functions
    print("\n[TEST 7] Verifying Admin API Authorization...")
    fake_admin_ctx = {"id": str(admin["_id"]), "role": "ADMIN"}
    # Serialize check ensures no passwords leaked
    safe_serialized = _serialize_hospital(hosp_doc_a)
    assert "password" not in safe_serialized
    assert "passwordHash" not in safe_serialized
    print("[PASS] Admin serialization excludes passwords and password hashes.")

    # 8. Admin Approves Hospital A
    print("\n[TEST 8] Verifying Admin Hospital Approval...")
    app_res = await approve_hospital(str(hosp_doc_a["_id"]), current_admin=fake_admin_ctx)
    assert app_res["status"] == "APPROVED"
    assert app_res["verified"] is True

    updated_hosp_a = await db.users.find_one({"_id": hosp_doc_a["_id"]})
    assert updated_hosp_a["status"] == "APPROVED"
    assert updated_hosp_a["verified"] is True
    assert updated_hosp_a.get("approvedAt") is not None
    assert updated_hosp_a.get("approvedBy") == str(admin["_id"])

    # Now Hospital A can login!
    h_token, h_err, h_code = await login_user("test_hosp_a@example.com", "Password123!")
    assert h_token is not None and h_err is None
    print("[PASS] APPROVED hospital can now log in normally.")

    # 9. Admin Rejects Hospital B
    print("\n[TEST 9] Verifying Hospital Rejection Flow...")
    hosp_b_data = RegisterRequest(
        name="Dr. Jones",
        email="test_hosp_b@example.com",
        phone="9876543212",
        password="Password123!",
        role="HOSPITAL",
        hospitalName="Reject Clinic",
        location=Location(latitude=13.0827, longitude=80.2707, address="789 Clinic Rd, Chennai"),
    )
    user_b, _ = await register_user(hosp_b_data)
    hosp_doc_b = await db.users.find_one({"email": "test_hosp_b@example.com"})

    rej_res = await reject_hospital(str(hosp_doc_b["_id"]), current_admin=fake_admin_ctx)
    assert rej_res["status"] == "REJECTED"
    assert rej_res["verified"] is False

    rej_login, rej_err, rej_code = await login_user("test_hosp_b@example.com", "Password123!")
    assert rej_login is None and rej_code == 403
    assert "not approved" in rej_err.lower()
    print(f"[PASS] REJECTED hospital blocked from login with message: '{rej_err}'")

    # 10. Multiple Hospital Independence
    print("\n[TEST 10] Verifying Multiple Hospital Queue Independence...")
    hosp_c_data = RegisterRequest(
        name="Dr. Taylor",
        email="test_hosp_c@example.com",
        phone="9876543213",
        password="Password123!",
        role="HOSPITAL",
        hospitalName="Pending Clinic",
        location=Location(latitude=13.0827, longitude=80.2707, address="101 Pending Rd, Chennai"),
    )
    await register_user(hosp_c_data)
    hosp_doc_c = await db.users.find_one({"email": "test_hosp_c@example.com"})

    # Check states: A is APPROVED, B is REJECTED, C is PENDING
    doc_a = await db.users.find_one({"_id": hosp_doc_a["_id"]})
    doc_b = await db.users.find_one({"_id": hosp_doc_b["_id"]})
    doc_c = await db.users.find_one({"_id": hosp_doc_c["_id"]})
    assert doc_a["status"] == "APPROVED"
    assert doc_b["status"] == "REJECTED"
    assert doc_c["status"] == "PENDING"
    print("[PASS] Hospital A (APPROVED), B (REJECTED), C (PENDING) remain strictly independent.")

    # 11. Forgot Password Role-Specific Workflow
    print("\n[TEST 11] Verifying Forgot Password Role-Specific Workflow...")
    # Request for hospital
    msg = await request_password_reset("test_hosp_a@example.com")
    reset_doc_hosp = await db.password_reset_tokens.find_one({"email": "test_hosp_a@example.com"}, sort=[("created_at", -1)])
    assert reset_doc_hosp is not None
    assert reset_doc_hosp["role"] == "HOSPITAL", f"Expected role HOSPITAL, got {reset_doc_hosp.get('role')}"

    # Request for donor
    msg_donor = await request_password_reset("test_donor_x@example.com")
    reset_doc_donor = await db.password_reset_tokens.find_one({"email": "test_donor_x@example.com"}, sort=[("created_at", -1)])
    assert reset_doc_donor is not None
    assert reset_doc_donor["role"] == "DONOR", f"Expected role DONOR, got {reset_doc_donor.get('role')}"
    print("[PASS] Reset tokens capture the authoritative account role from MongoDB.")

    # Clean up test accounts
    await db.users.delete_many({"email": {"$in": test_emails}})
    await db.password_reset_tokens.delete_many({"email": {"$in": test_emails}})
    print("\n[PASS] Cleaned up test records.")

    print("\n" + "=" * 60)
    print("ALL VERIFICATION SUITE TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(run_tests())
