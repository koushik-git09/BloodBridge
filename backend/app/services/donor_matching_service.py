from datetime import datetime, timezone
from math import radians, sin, cos, sqrt, atan2

from app.database.mongodb import db


# =========================================================
# BLOOD GROUP COMPATIBILITY
# =========================================================

BLOOD_COMPATIBILITY = {
    "A+": ["A+", "A-"],
    "A-": ["A-"],

    "B+": ["B+", "B-"],
    "B-": ["B-"],

    "AB+": [
        "A+",
        "A-",
        "B+",
        "B-",
        "AB+",
        "AB-",
        "O+",
        "O-",
    ],

    "AB-": [
        "A-",
        "B-",
        "AB-",
        "O-",
    ],

    "O+": [
        "O+",
        "O-",
    ],

    "O-": [
        "O-",
    ],
}


# =========================================================
# DISTANCE
# =========================================================

def calculate_distance_km(
    latitude_1: float,
    longitude_1: float,
    latitude_2: float,
    longitude_2: float,
) -> float:
    """
    Calculate distance between two coordinates
    using the Haversine formula.
    """
    try:
        lat1_f = float(latitude_1)
        lon1_f = float(longitude_1)
        lat2_f = float(latitude_2)
        lon2_f = float(longitude_2)
    except (TypeError, ValueError):
        return 9999.0

    earth_radius_km = 6371.0

    r_lat1 = radians(lat1_f)
    r_lon1 = radians(lon1_f)

    r_lat2 = radians(lat2_f)
    r_lon2 = radians(lon2_f)

    delta_lat = r_lat2 - r_lat1
    delta_lon = r_lon2 - r_lon1

    a = (
        sin(delta_lat / 2) ** 2
        + cos(r_lat1)
        * cos(r_lat2)
        * sin(delta_lon / 2) ** 2
    )

    # Clamp a to [0.0, 1.0] to prevent floating point inaccuracies causing math domain errors
    a = min(1.0, max(0.0, a))

    c = 2 * atan2(
        sqrt(a),
        sqrt(1 - a),
    )

    return round(
        earth_radius_km * c,
        2,
    )



# =========================================================
# DONATION ELIGIBILITY
# =========================================================

def is_donor_eligible(
    last_donation,
) -> bool:
    """
    A donor is eligible when:

    1. They have never donated, or
    2. At least 90 days have passed since their
       previous donation.
    """

    if not last_donation:
        return True

    if isinstance(last_donation, str):
        try:
            last_donation = datetime.fromisoformat(
                last_donation.replace(
                    "Z",
                    "+00:00",
                )
            )
        except ValueError:
            return False

    if last_donation.tzinfo is None:
        last_donation = last_donation.replace(
            tzinfo=timezone.utc
        )

    now = datetime.now(timezone.utc)

    days_since_donation = (
        now - last_donation
    ).days

    return days_since_donation >= 90


# =========================================================
# COMPATIBILITY
# =========================================================

def is_blood_compatible(
    requested_group: str,
    donor_group: str,
) -> bool:
    """
    Check whether a donor's blood group can be used
    for the requested recipient blood group.
    """

    compatible_groups = BLOOD_COMPATIBILITY.get(
        requested_group,
        [],
    )

    return donor_group in compatible_groups


# =========================================================
# MATCH SCORE
# =========================================================

def calculate_match_score(
    distance_km: float,
    compatible: bool,
    trust_score: float,
) -> float:
    """
    Rule-based donor ranking score.

    Weight:
        Distance      = 60%
        Compatibility = 25%
        Trust         = 15%

    This is intentionally rule-based for now.
    ML will replace/enhance this later.
    """

    # -----------------------------------------------------
    # Distance score
    # -----------------------------------------------------

    if distance_km <= 1:
        distance_score = 100
    elif distance_km <= 5:
        distance_score = 90
    elif distance_km <= 10:
        distance_score = 75
    elif distance_km <= 15:
        distance_score = 60
    elif distance_km <= 25:
        distance_score = 40
    else:
        distance_score = 20

    # -----------------------------------------------------
    # Compatibility score
    # -----------------------------------------------------

    compatibility_score = (
        100 if compatible else 0
    )

    # -----------------------------------------------------
    # Trust score
    # -----------------------------------------------------

    trust_score = max(
        0,
        min(float(trust_score), 100),
    )

    # -----------------------------------------------------
    # Final score
    # -----------------------------------------------------

    score = (
        distance_score * 0.60
        + compatibility_score * 0.25
        + trust_score * 0.15
    )

    return round(score, 2)


# =========================================================
# FIND TOP DONORS
# =========================================================

async def find_matching_donors(
    request_id: str,
    blood_group: str,
    hospital_location: dict,
    limit: int = 10,
):
    """
    Find the best available donors for a blood request.

    Matching criteria:

        1. DONOR role
        2. AVAILABLE status
        3. Compatible blood group
        4. Donation eligibility
        5. Location
        6. Trust score

    Returns up to 10 donors.
    """

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

    matching_donors = []

    compatible_groups = BLOOD_COMPATIBILITY.get(
        blood_group,
        [],
    )

    if not compatible_groups:
        return []

    # -----------------------------------------------------
    # Find donors
    # -----------------------------------------------------

    cursor = db.users.find({
        "role": "DONOR",
        "availability": "AVAILABLE",
    })

    async for donor in cursor:

        donor_blood_group = donor.get(
            "bloodGroup"
        )

        # -------------------------------------------------
        # Blood compatibility
        # -------------------------------------------------

        if donor_blood_group not in compatible_groups:
            continue

        # -------------------------------------------------
        # Donation eligibility
        # -------------------------------------------------

        if not is_donor_eligible(
            donor.get("lastDonation")
        ):
            continue

        # -------------------------------------------------
        # Location
        # -------------------------------------------------

        donor_location = donor.get(
            "location"
        )

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

        # -------------------------------------------------
        # Distance
        # -------------------------------------------------

        distance = calculate_distance_km(
            hospital_latitude,
            hospital_longitude,
            donor_latitude,
            donor_longitude,
        )

        # -------------------------------------------------
        # Trust
        # -------------------------------------------------

        trust_score = float(
            donor.get(
                "trustScore",
                50,
            )
        )

        # -------------------------------------------------
        # Match score
        # -------------------------------------------------

        match_score = calculate_match_score(
            distance_km=distance,
            compatible=True,
            trust_score=trust_score,
        )

        # -------------------------------------------------
        # Add donor
        # -------------------------------------------------

        matching_donors.append({
            "donor_id": str(
                donor["_id"]
            ),

            "name": donor.get(
                "name",
                "Donor",
            ),

            "blood_group": donor_blood_group,

            "availability": donor.get(
                "availability",
                "AVAILABLE",
            ),

            "distance": distance,

            "match_score": match_score,

            "trust_score": trust_score,

            "donation_count": donor.get(
                "donationCount",
                0,
            ),

            "last_donation": donor.get(
                "lastDonation"
            ),

            "address": donor_location.get("address", ""),

            "phone": donor.get("phone", ""),

            "request_id": request_id,
        })


    # -----------------------------------------------------
    # Rank donors
    # -----------------------------------------------------

    matching_donors.sort(
        key=lambda donor: (
            -donor["match_score"],
            donor["distance"],
            -donor["trust_score"],
        )
    )

    # -----------------------------------------------------
    # Return top 10
    # -----------------------------------------------------

    return matching_donors[:limit]