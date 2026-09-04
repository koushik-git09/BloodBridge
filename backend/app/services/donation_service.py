from bson import ObjectId

from app.database.mongodb import db


async def get_donor_donation_history(
    donor_id: str,
):
    """
    Return all completed donations for the logged-in donor.
    """

    donations = []

    cursor = db.donations.find(
        {
            "donor_id": donor_id,
            "status": "COMPLETED",
        }
    ).sort(
        "donated_at",
        -1,
    )

    async for donation in cursor:

        hospital_name = None

        try:
            hospital = await db.users.find_one(
                {
                    "_id": ObjectId(
                        donation["hospital_id"]
                    )
                }
            )

            if hospital:
                hospital_name = hospital.get(
                    "hospitalName",
                    hospital.get("name"),
                )

        except Exception:
            pass

        donations.append({
            "id": str(
                donation["_id"]
            ),

            "donor_id": donation["donor_id"],

            "request_id": donation["request_id"],

            "hospital_id": donation["hospital_id"],

            "hospital_name": hospital_name,

            "blood_group": donation["blood_group"],

            "units": donation["units"],

            "donated_at": donation["donated_at"],

            "status": donation["status"],
        })

    return donations


async def get_donor_statistics(
    donor_id: str,
):
    """
    Calculate donor statistics from real donation history.
    """

    donations = await db.donations.find(
        {
            "donor_id": donor_id,
            "status": "COMPLETED",
        }
    ).to_list(
        length=None
    )

    total_donations = len(
        donations
    )

    total_units = sum(
        int(
            donation.get(
                "units",
                0,
            )
        )
        for donation in donations
    )

    donor = None

    try:
        donor = await db.users.find_one(
            {
                "_id": ObjectId(donor_id),
                "role": "DONOR",
            }
        )
    except Exception:
        pass

    trust_score = 50

    if donor:
        trust_score = float(
            donor.get(
                "trustScore",
                50,
            )
        )

    last_donation = None

    if donations:
        donations.sort(
            key=lambda donation: donation.get(
                "donated_at"
            ),
            reverse=True,
        )

        last_donation = donations[0].get(
            "donated_at"
        )

    return {
        "total_donations": total_donations,
        "total_units": total_units,
        "last_donation": last_donation,
        "trust_score": trust_score,
    }