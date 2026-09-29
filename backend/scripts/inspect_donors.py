import asyncio
import os
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.database.mongodb import db

async def check():
    donors = await db.users.find({"role": "DONOR"}).to_list(10)
    for d in donors:
        print("Donor:", d.get("email"), "Availability:", d.get("availability"), "LastDonation:", d.get("lastDonation"), "BloodGroup:", d.get("bloodGroup"))
    
    donations = await db.donations.find().to_list(10)
    print("\nTotal donations:", len(donations))
    for dn in donations:
        print("Donation:", dn.get("donor_id"), dn.get("status"), dn.get("donated_at"))

    reqs = await db.blood_requests.find().sort("created_at", -1).to_list(5)
    print("\nRecent blood requests:", len(reqs))
    for r in reqs:
        print("Req:", r.get("_id"), "Group:", r.get("blood_group"), "Status:", r.get("status"), "Hospital:", r.get("hospital_name"))

if __name__ == "__main__":
    asyncio.run(check())
