from datetime import datetime, date, timezone

from bson import ObjectId

from app.database.mongodb import db
from app.services.location_service import calculate_distance


# Compatible donor blood groups for each recipient blood group.
# This assumes red blood cell compatibility.
BLOOD_COMPATIBILITY = {
    "A+": ["A+", "A-", "O+", "O-"],
    "A-": ["A-", "O-"],
    "B+": ["B+", "B-", "O+", "O-"],
    "B-": ["B-", "O-"],
    "AB+": [
        "A+", "A-",
        "B+", "B-",
        "AB+", "AB-",
        "O+", "O-",
    ],
    "AB-": ["A-", "B-", "AB-", "O-"],
    "O+": ["O+", "O-"],
    "O-": ["O-"],
}


def is_donor_eligible(last_donation):
    """
    Basic donation eligibility check.

    For the prototype, a donor is considered eligible if:
    - They have never donated, OR
    - Their last donation date was at least 90 days ago.

    This is application-level matching logic and should not replace
    clinical or blood-bank eligibility screening.
    """

    if last_donation is None:
        return True

    # Handle datetime values from MongoDB
    if isinstance(last_donation, datetime):
        last_donation = last_donation.date()

    # Handle string dates if they exist
    if isinstance(last_donation, str):
        try:
            last_donation = date.fromisoformat(
                last_donation.split("T")[0]
            )
        except ValueError:
            return False

    days_since_donation = (
        date.today() - last_donation
    ).days

    return days_since_donation >= 90


def calculate_match_score(
    distance: float,
    trust_score: float,
    exact_blood_match: bool,
):
    """
    Calculate an intelligent match score.

    Distance is given high importance because BloodBridge
    prioritizes the nearest eligible donor.
    """

    # Distance score: closer donor = higher score
    if distance <= 2:
        distance_score = 100
    elif distance <= 5:
        distance_score = 90
    elif distance <= 10:
        distance_score = 75
    elif distance <= 20:
        distance_score = 60
    else:
        distance_score = 40

    # Exact blood group gets a small advantage
    compatibility_score = 100 if exact_blood_match else 80

    # Final weighted score
    match_score = (
        distance_score * 0.60
        + compatibility_score * 0.25
        + trust_score * 0.15
    )

    return round(match_score, 2)


async def find_matching_donors(
    request_id: str,
):
    """
    Find and rank suitable donors for a blood request.

    Priority:
    1. Blood compatibility
    2. AVAILABLE status
    3. Donation eligibility
    4. Nearest distance
    5. Trust score
    """

    # ------------------------------------------------
    # 1. Get blood request
    # ------------------------------------------------

    try:
        blood_request = await db.blood_requests.find_one(
            {
                "_id": ObjectId(request_id)
            }
        )
    except Exception:
        return []

    if not blood_request:
        return []

    # Do not match donors if request is already fulfilled
    remaining_units = blood_request.get(
        "remaining_units",
        0
    )

    if remaining_units <= 0:
        return []

    blood_group = blood_request["blood_group"]

    hospital_id = blood_request["hospital_id"]

    # ------------------------------------------------
    # 2. Get hospital
    # ------------------------------------------------

    try:
        hospital = await db.users.find_one(
            {
                "_id": ObjectId(hospital_id),
                "role": "HOSPITAL",
            }
        )
    except Exception:
        return []

    if not hospital:
        return []

    hospital_location = hospital.get("location")

    if not hospital_location:
        return []

    hospital_latitude = hospital_location.get(
        "latitude"
    )

    hospital_longitude = hospital_location.get(
        "longitude"
    )

    if (
        hospital_latitude is None
        or hospital_longitude is None
    ):
        return []

    # ------------------------------------------------
    # 3. Find compatible AVAILABLE donors
    # ------------------------------------------------

    compatible_groups = BLOOD_COMPATIBILITY.get(
        blood_group,
        []
    )

    if not compatible_groups:
        return []

    cursor = db.users.find(
        {
            "role": "DONOR",
            "availability": "AVAILABLE",
            "bloodGroup": {
                "$in": compatible_groups
            },
        }
    )

    matched_donors = []

    # ------------------------------------------------
    # 4. Check eligibility and calculate distance
    # ------------------------------------------------

    async for donor in cursor:

        donor_location = donor.get("location")

        if not donor_location:
            continue

        donor_latitude = donor_location.get(
            "latitude"
        )

        donor_longitude = donor_location.get(
            "longitude"
        )

        if (
            donor_latitude is None
            or donor_longitude is None
        ):
            continue

        # Check donation eligibility
        if not is_donor_eligible(
            donor.get("lastDonation")
        ):
            continue

        # Calculate hospital -> donor distance
        distance = calculate_distance(
            float(hospital_latitude),
            float(hospital_longitude),
            float(donor_latitude),
            float(donor_longitude),
        )

        exact_blood_match = (
            donor.get("bloodGroup")
            == blood_group
        )

        trust_score = float(
            donor.get("trustScore", 50)
        )

        match_score = calculate_match_score(
            distance=distance,
            trust_score=trust_score,
            exact_blood_match=exact_blood_match,
        )

        matched_donors.append(
            {
                "donor_id": str(donor["_id"]),
                "name": donor.get("name"),
                "blood_group": donor.get(
                    "bloodGroup"
                ),

                "distance": distance,

                "trust_score": trust_score,

                "match_score": match_score,

                "exact_blood_match": exact_blood_match,

                "availability": donor.get(
                    "availability"
                ),

                "eligible": True,

                "location": {
                    "address": donor_location.get(
                        "address"
                    )
                },
            }
        )

    # ------------------------------------------------
    # 5. Sort donors
    # ------------------------------------------------

    # PRIMARY: Nearest donor
    # SECONDARY: Higher match score
    # THIRD: Higher trust score

    matched_donors.sort(
        key=lambda donor: (
            donor["distance"],
            -donor["match_score"],
            -donor["trust_score"],
        )
    )

    return matched_donors[:10]