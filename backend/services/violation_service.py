from datetime import datetime
from db import get_db
from utils.validators import validate_violation

class ViolationService:
    @staticmethod
    def create_violation(violation_data):
        db = get_db()
        
        # Validate type and location
        v_type = violation_data.get("violation_type")
        loc = violation_data.get("location")
        is_valid, error = validate_violation(v_type, loc)
        if not is_valid:
            raise ValueError(error)
            
        violation_data["timestamp"] = datetime.utcnow()
        violation_data["status"] = violation_data.get("status", "Pending")
        
        # Insert violation
        result = db.violations.insert_one(violation_data)
        
        # Map violation type to counter field
        v_type_lower = v_type.lower()
        if "late" in v_type_lower:
            specific_count_field = "late_count"
        elif "bunk" in v_type_lower:
            specific_count_field = "bunk_count"
        elif "dress" in v_type_lower:
            specific_count_field = "dress_code_count"
        else:
            specific_count_field = None  # Generic violation
        
        # Build increment dict
        inc_data = {"violations_count": 1}
        if specific_count_field:
            inc_data[specific_count_field] = 1

        db.students.update_one(
            {"roll_no": violation_data["student_id"]},
            {
                "$inc": inc_data,
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        return str(result.inserted_id)

    @staticmethod
    def delete_violation(violation_id):
        db = get_db()
        from bson import ObjectId
        
        violation = db.violations.find_one({"_id": ObjectId(violation_id)})
        if not violation:
            return False
            
        student_id = violation["student_id"]
        v_type = violation["violation_type"]
        
        # Delete violation
        db.violations.delete_one({"_id": ObjectId(violation_id)})
        
        # Map violation type to counter field
        v_type_lower = v_type.lower()
        if "late" in v_type_lower:
            specific_count_field = "late_count"
        elif "bunk" in v_type_lower:
            specific_count_field = "bunk_count"
        elif "dress" in v_type_lower:
            specific_count_field = "dress_code_count"
        else:
            specific_count_field = None  # Generic violation
        
        # Build decrement dict
        inc_data = {"violations_count": -1}
        if specific_count_field:
            inc_data[specific_count_field] = -1

        db.students.update_one(
            {"roll_no": student_id},
            {
                "$inc": inc_data,
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        return True

    @staticmethod
    def get_violations(filters=None):
        db = get_db()
        violations = list(db.violations.find(filters or {}).sort("timestamp", -1))
        for v in violations:
            v["_id"] = str(v["_id"])
        return violations
