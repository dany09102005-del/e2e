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
ALLOWED_STATUSES = {"Pending", "Reviewed", "Resolved", "Escalated"}

def validate_violation(violation_data):
    """
    Strictly validate violation object schema constraints.
    """
    v_type = violation_data.get("type", violation_data.get("violation_type"))
    location = violation_data.get("location")
    
    if not v_type or v_type not in ALLOWED_VIOLATION_TYPES:
        return False, f"Invalid or missing type: {v_type}. Allowed: {list(ALLOWED_VIOLATION_TYPES)}"
    
    if not location or location not in ALLOWED_LOCATIONS:
        return False, f"Invalid or missing location: {location}. Allowed: {list(ALLOWED_LOCATIONS)}"
        
    required_str_fields = ["roll_no", "department", "section", "remarks"]
    for field in required_str_fields:
        if not violation_data.get(field) or str(violation_data.get(field)).strip() == "":
            return False, f"Missing required string field: {field}"
            
    # Normalize type to standard schema key immediately to prevent dual usage later
    violation_data["type"] = v_type
    
    return True, None
