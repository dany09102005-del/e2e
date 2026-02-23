ALLOWED_VIOLATION_TYPES = {"Late Arrival", "Dress Code", "Bunk"}
ALLOWED_LOCATIONS = {
    "A Block",
    "B Block",
    "C Block",
    "D Block",
    "U Block",
    "Central Block",
    "Playground",
}

def validate_violation(violation_type, location):
    """
    Strictly validate violation type and location.
    """
    if violation_type not in ALLOWED_VIOLATION_TYPES:
        return False, f"Invalid violation type: {violation_type}. Allowed: {list(ALLOWED_VIOLATION_TYPES)}"
    
    if location not in ALLOWED_LOCATIONS:
        return False, f"Invalid location: {location}. Allowed: {list(ALLOWED_LOCATIONS)}"
    
    return True, None
