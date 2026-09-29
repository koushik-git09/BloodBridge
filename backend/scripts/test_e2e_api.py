import asyncio
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
import httpx

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.main import app
from app.database.mongodb import db

async def run_e2e_tests():
    print("=" * 60)
    print("RUNNING END-TO-END HTTP API TEST SUITE")
    print("=" * 60)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Clean up test accounts
        test_emails = [
            "e2e_hosp_alpha@example.com",
            "e2e_hosp_beta@example.com",
            "e2e_hosp_gamma@example.com",
            "e2e_donor@example.com",
            "e2e_bank@example.com",
        ]
        await db.users.delete_many({"email": {"$in": test_emails}})
        await db.password_reset_tokens.delete_many({"email": {"$in": test_emails}})

        # 1. Unauthenticated Admin API request
        print("\n[E2E 1] Testing unauthenticated access to admin endpoints...")
        resp = await client.get("/api/admin/hospital-registrations")
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        print("[PASS] Unauthenticated request to /api/admin/hospital-registrations returns 401.")

        # 2. Register a donor and verify immediate access
        print("\n[E2E 2] Registering donor and testing normal login...")
        reg_donor = await client.post("/api/auth/register", json={
            "name": "Donor Dan",
            "email": "e2e_donor@example.com",
            "password": "DonorPassword123!",
            "phone": "9991112233",
            "role": "DONOR",
            "bloodGroup": "A+",
            "location": {"latitude": 12.9716, "longitude": 77.5946, "address": "Bangalore Center"},
        })
        assert reg_donor.status_code == 201, f"Donor registration failed: {reg_donor.text}"

        login_donor = await client.post("/api/auth/login", json={
            "email": "e2e_donor@example.com",
            "password": "DonorPassword123!",
        })
        assert login_donor.status_code == 200, f"Donor login failed: {login_donor.text}"
        donor_token = login_donor.json()["access_token"]
        print("[PASS] Donor registered and logged in with 200 OK.")

        # 3. Donor tries to access admin API -> 403 Forbidden
        print("\n[E2E 3] Testing donor token on admin endpoint (403 Forbidden check)...")
        donor_admin_resp = await client.get(
            "/api/admin/hospital-registrations",
            headers={"Authorization": f"Bearer {donor_token}"},
        )
        assert donor_admin_resp.status_code == 403, f"Expected 403 for donor, got {donor_admin_resp.status_code}"
        print("[PASS] Donor token correctly blocked from admin endpoints with 403 Forbidden.")

        # 4. Register 3 Hospitals (Alpha, Beta, Gamma)
        print("\n[E2E 4] Registering 3 hospitals (Alpha, Beta, Gamma)...")
        for code_name, email in [
            ("Alpha Hospital", "e2e_hosp_alpha@example.com"),
            ("Beta Clinic", "e2e_hosp_beta@example.com"),
            ("Gamma Medical Center", "e2e_hosp_gamma@example.com"),
        ]:
            reg_hosp = await client.post("/api/auth/register", json={
                "name": f"Admin of {code_name}",
                "email": email,
                "password": "HospitalPassword123!",
                "phone": "9000000001",
                "role": "HOSPITAL",
                "hospitalName": code_name,
                "location": {"latitude": 10.3833, "longitude": 78.8001, "address": "Pudukkottai, Tamil Nadu, India"},
            })
            assert reg_hosp.status_code == 201
            assert "pending admin approval" in reg_hosp.json()["message"]
        print("[PASS] All 3 hospitals registered with pending approval message.")

        # 5. Verify pending hospitals cannot log in
        print("\n[E2E 5] Verifying pending hospitals cannot log in...")
        hosp_login_try = await client.post("/api/auth/login", json={
            "email": "e2e_hosp_alpha@example.com",
            "password": "HospitalPassword123!",
        })
        assert hosp_login_try.status_code == 403
        assert "pending admin approval" in hosp_login_try.json()["detail"]
        print("[PASS] PENDING hospital blocked from login with 403.")

        # 6. Admin login
        print("\n[E2E 6] Admin login through /api/admin/login...")
        admin_login_resp = await client.post("/api/admin/login", json={
            "email": "bloodbridgeadmin@gmail.com",
            "password": "12345678",
        })
        assert admin_login_resp.status_code == 200, f"Admin login failed: {admin_login_resp.text}"
        admin_token = admin_login_resp.json()["access_token"]
        print("[PASS] Admin login succeeded with 200 OK and valid JWT.")

        # 7. Non-admin trying admin login
        print("\n[E2E 7] Testing non-admin user on /api/admin/login...")
        non_admin_try = await client.post("/api/admin/login", json={
            "email": "e2e_donor@example.com",
            "password": "DonorPassword123!",
        })
        assert non_admin_try.status_code == 403
        print("[PASS] Normal user credentials rejected at /api/admin/login with 403 Forbidden.")

        # 8. Admin lists hospital registrations
        print("\n[E2E 8] Admin lists hospital registrations...")
        list_resp = await client.get(
            "/api/admin/hospital-registrations",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert list_resp.status_code == 200
        hospitals = list_resp.json()
        assert len(hospitals) >= 3

        # Check security: no passwords, password hashes, or secrets
        for h in hospitals:
            assert "password" not in h, "CRITICAL: password field exposed!"
            assert "passwordHash" not in h, "CRITICAL: passwordHash exposed!"
        print("[PASS] Admin received registrations list with zero sensitive fields exposed.")

        # Locate IDs
        hosp_alpha = next(h for h in hospitals if h["email"] == "e2e_hosp_alpha@example.com")
        hosp_beta = next(h for h in hospitals if h["email"] == "e2e_hosp_beta@example.com")
        hosp_gamma = next(h for h in hospitals if h["email"] == "e2e_hosp_gamma@example.com")

        # 9. Admin approves Alpha, rejects Beta, leaves Gamma pending
        print("\n[E2E 9] Admin approves Alpha and rejects Beta...")
        app_resp = await client.patch(
            f"/api/admin/hospital-registrations/{hosp_alpha['id']}/approve",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert app_resp.status_code == 200
        assert app_resp.json()["status"] == "APPROVED"

        rej_resp = await client.patch(
            f"/api/admin/hospital-registrations/{hosp_beta['id']}/reject",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert rej_resp.status_code == 200
        assert rej_resp.json()["status"] == "REJECTED"
        print("[PASS] Alpha APPROVED, Beta REJECTED.")

        # 10. Verify logins after decisions
        print("\n[E2E 10] Verifying login states post-decision...")
        # Alpha should now be able to login
        alpha_login = await client.post("/api/auth/login", json={
            "email": "e2e_hosp_alpha@example.com",
            "password": "HospitalPassword123!",
        })
        assert alpha_login.status_code == 200, f"Approved hospital login failed: {alpha_login.text}"

        # Beta should be blocked as not approved
        beta_login = await client.post("/api/auth/login", json={
            "email": "e2e_hosp_beta@example.com",
            "password": "HospitalPassword123!",
        })
        assert beta_login.status_code == 403
        assert "not approved" in beta_login.json()["detail"].lower()

        # Gamma should remain pending
        gamma_login = await client.post("/api/auth/login", json={
            "email": "e2e_hosp_gamma@example.com",
            "password": "HospitalPassword123!",
        })
        assert gamma_login.status_code == 403
        assert "pending admin approval" in gamma_login.json()["detail"].lower()
        print("[PASS] Alpha logged in (200), Beta blocked (403 not approved), Gamma blocked (403 pending).")

        # 11. Role-specific Forgot Password & Token verification
        print("\n[E2E 11] Testing role-specific Forgot Password & Token verification...")
        # Forgot password for Alpha (hospital)
        fp_alpha = await client.post("/api/auth/forgot-password", json={"email": "e2e_hosp_alpha@example.com"})
        assert fp_alpha.status_code == 200

        # Retrieve raw token from test DB for verification
        from app.services.auth_service import hash_reset_token
        # Find token doc
        token_doc = await db.password_reset_tokens.find_one({"email": "e2e_hosp_alpha@example.com"}, sort=[("created_at", -1)])
        assert token_doc is not None
        assert token_doc["role"] == "HOSPITAL"

        # Verify token endpoint
        # For test purposes, we need a raw token; let's generate a temporary token pair to test verify endpoint
        from app.core.security import generate_reset_token
        test_raw = generate_reset_token()
        test_hash = hash_reset_token(test_raw)
        now = datetime.now(timezone.utc)
        await db.password_reset_tokens.insert_one({
            "user_id": token_doc["user_id"],
            "email": "e2e_hosp_alpha@example.com",
            "role": "HOSPITAL",
            "token_hash": test_hash,
            "created_at": now,
            "expires_at": now.replace(year=now.year + 1),
            "used": False,
        })

        verify_resp = await client.get(f"/api/auth/verify-reset-token?token={test_raw}")
        assert verify_resp.status_code == 200
        assert verify_resp.json()["valid"] is True
        assert verify_resp.json()["role"] == "HOSPITAL"

        # Reset password
        reset_resp = await client.post("/api/auth/reset-password", json={
            "token": test_raw,
            "new_password": "NewHospitalPassword999!",
        })
        assert reset_resp.status_code == 200
        assert reset_resp.json()["role"] == "HOSPITAL"

        # Login with new password
        new_pwd_login = await client.post("/api/auth/login", json={
            "email": "e2e_hosp_alpha@example.com",
            "password": "NewHospitalPassword999!",
        })
        assert new_pwd_login.status_code == 200
        print("[PASS] Forgot password and token verification successfully resolved role HOSPITAL and updated password.")

        # Clean up test accounts
        await db.users.delete_many({"email": {"$in": test_emails}})
        await db.password_reset_tokens.delete_many({"email": {"$in": test_emails}})
        print("[PASS] Cleaned up all test records.")

    print("\n" + "=" * 60)
    print("ALL END-TO-END HTTP TESTS COMPLETED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(run_e2e_tests())
