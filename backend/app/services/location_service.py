from math import radians, sin, cos, sqrt, atan2


def calculate_distance(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
) -> float:
    """
    Calculate distance between two geographical coordinates
    using the Haversine formula.

    Returns distance in kilometers.
    """
    try:
        lat1_f = float(lat1)
        lon1_f = float(lon1)
        lat2_f = float(lat2)
        lon2_f = float(lon2)
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

    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    return round(
        earth_radius_km * c,
        2
    )