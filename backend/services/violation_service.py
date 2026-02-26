from datetime import datetime
from db import get_db
from utils.validators import validate_violation

class ViolationService:
    @staticmethod
    def create_violation(violation_data):
        db = get_db()
        
        # Validate type, location, and required fields
        is_valid, error = validate_violation(violation_data)
        if not is_valid:
            raise ValueError(error)
            
        violation_data["created_at"] = datetime.utcnow()
        violation_data["updated_at"] = datetime.utcnow()
        
        # Enforce Status Enum and strip old values
        status = violation_data.get("status", "Pending")
        from utils.validators import ALLOWED_STATUSES
        violation_data["status"] = status if status in ALLOWED_STATUSES else "Pending"
        
        # Map frontend 'student_id' payload if they use it over 'roll_no'
        student_id = violation_data.get("roll_no")
        
        # Clean 'student_id' if exists in payload to keep structure normalized
        if "student_id" in violation_data:
            del violation_data["student_id"]
        
        # Insert violation
        result = db.violations.insert_one(violation_data)
        
        # Map violation type to counter field
        v_type_lower = violation_data["type"].lower()
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
            {"roll_no": student_id},
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
            
        student_id = violation["roll_no"]
        v_type = violation["type"]
        
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
        pipeline = []
        if filters:
            pipeline.append({"$match": filters})
            
        pipeline.extend([
            {
                "$lookup": {
                    "from": "students",
                    "localField": "roll_no",
                    "foreignField": "roll_no",
                    "as": "student_info"
                }
            },
            {
                "$unwind": {
                    "path": "$student_info",
                    "preserveNullAndEmptyArrays": True
                }
            },
            {
                "$addFields": {
                    "student_name": {"$ifNull": ["$student_info.name", "Unknown Student"]}
                }
            },
            {
                "$project": {
                    "student_info": 0
                }
            },
            {"$sort": {"created_at": -1}}
        ])
        
        violations = list(db.violations.aggregate(pipeline))
        
        for v in violations:
            v["_id"] = str(v["_id"])
            if "created_at" in v:
                # Human readable date for display
                v["date"] = v["created_at"].strftime("%b %d, %Y %I:%M %p")
                # Strict ISO date for the HTML date picker filter
                v["iso_date"] = v["created_at"].strftime("%Y-%m-%d")
                
        return violations
