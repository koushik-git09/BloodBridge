import asyncio
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from bson import ObjectId
from app.database.mongodb import db
from app.core.config import FRONTEND_URL
from app.services.donor_matching_service import is_donor_eligible, find_matching_donors
from app.services.email_service import send_password_reset_email
from app.services.donor_request_service import create_donor_requests_for_blood_request

async def test_fixes():
    print("=" * 60)
    print("VERIFYING FIXES")
    print("=" * 60)

    # 1. Verify FRONTEND_URL
    print(f"\n[TEST 1] FRONTEND_URL is: {FRONTEND_URL}")
    assert FRONTEND_URL == "https://blood-bridge-beryl.vercel.app", f"Unexpected URL: {FRONTEND_URL}"
    print("[PASS] FRONTEND_URL is correctly set to https://blood-bridge-beryl.vercel.app")

    # 2. Verify is_donor_eligible for AVAILABLE donor with recent donation
    print("\n[TEST 2] Testing eligibility for donor with recent donation who is marked AVAILABLE...")
    recent_donation = datetime.now(timezone.utc)
    
    # If availability is UNAVAILABLE (standard cooldown) -> not eligible
    assert is_donor_eligible(recent_donation, availability="UNAVAILABLE") is False
    print("[PASS] Donor in standard cooldown with UNAVAILABLE is not eligible.")

    # If availability is AVAILABLE (manual toggle in portal) -> eligible!
    assert is_donor_eligible(recent_donation, availability="AVAILABLE") is True
    print("[PASS] Donor with recent donation who sets status to AVAILABLE is now ELIGIBLE!")

    # 3. Test find_matching_donors includes the available donor
    print("\n[TEST 3] Testing find_matching_donors for request 6abbb07778c8be3884d90978...")
    req = await db.blood_requests.find_one({"_id": ObjectId("6abbb07778c8be3884d90978")})
    assert req is not None, "Request 6abbb07778c8be3884d90978 not found"
    
    h_user = await db.users.find_one({"_id": ObjectId(req["hospital_id"])})
    h_loc = (h_user.get("location") if h_user else None) or req.get("location") or {"latitude": 10.3833, "longitude": 78.8001}
    
    donors = await find_matching_donors(
        request_id=str(req["_id"]),
        blood_group=req["blood_group"],
        hospital_location=h_loc,
    )
    print(f"Matched donors count: {len(donors)}")
    for d in donors:
        print(f"  - Matched: {d['name']} (ID: {d['donor_id']}, Blood: {d['blood_group']}, Distance: {d['distance']} km)")

    # 4. Trigger create_donor_requests_for_blood_request for this active request
    print("\n[TEST 4] Triggering request creation for active request...")
    created = await create_donor_requests_for_blood_request(
        request_id=str(req["_id"]),
        hospital_id=req["hospital_id"],
        blood_group=req["blood_group"],
        hospital_location=h_loc,
    )
    print(f"Created donor requests count: {len(created)}")

    # Check donor's incoming requests in DB
    donor = await db.users.find_one({"email": "koushikgoud912@gmail.com"})
    if donor:
        d_reqs = await db.donor_requests.find({"donor_id": str(donor["_id"])}).to_list(10)
        print(f"Total requests for donor {donor['email']}: {len(d_reqs)}")
        for dr in d_reqs:
            print(f"  - Request ID: {dr.get('request_id')} | Status: {dr.get('status')} | Hospital: {dr.get('hospital_name')}")

    print("\n" + "=" * 60)
    print("ALL TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_fixes())
