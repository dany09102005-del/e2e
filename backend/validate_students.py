import os
import sys
from datetime import datetime, timezone

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from db import get_db

def validate_and_repair_students():
    print("Connecting to GuardDB...")
    db = get_db()
    students_col = db.students
    
    all_students = list(students_col.find({}))
    total_students = len(all_students)
    print(f"Found {total_students} students in the collection.")
    
    repaired_count = 0
    
    # Default placeholder values for academic fields
    default_placeholders = {
        "name": "Unknown Name",
        "program": "B.Tech",
        "batch": "2023-2027",
        "department": "UNKNOWN",
        "semester": 1,
        "section": "UNKNOWN",
        "mobile": "0000000000"
    }
    
    for student in all_students:
        updates = {}
        missing_fields = []
        student_id = student.get("student_id", "UNKNOWN")
        
        # 1. Academic & Top-level fields
        for field, default_val in default_placeholders.items():
            if field not in student:
                # specific placeholder for name if missing
                if field == "name":
                    updates[field] = f"Unknown Name {student_id}"
                else:
                    updates[field] = default_val
                missing_fields.append(field)
        
        # 2. Face object
        if "face" not in student:
            updates["face"] = {
                "image_filenames": [],
                "embedding": [],
                "status": "pending_image"
            }
            missing_fields.append("face")
        else:
            face = student["face"]
            face_updates = False
            
            if "image_filenames" not in face:
                face["image_filenames"] = []
                face_updates = True
            if "embedding" not in face:
                face["embedding"] = []
                face_updates = True
            if "status" not in face:
                face["status"] = "pending_image"
                face_updates = True
            
            if face_updates:
                updates["face"] = face
                missing_fields.append("face (partial)")
                
        # 3. Stats object
        if "stats" not in student:
            updates["stats"] = {
                "total": 0,
                "types": {
                    "bunk": 0,
                    "late_arrival": 0,
                    "dress_code": 0
                }
            }
            missing_fields.append("stats")
        else:
            stats = student["stats"]
            stats_updates = False
            
            if "total" not in stats:
                stats["total"] = 0
                stats_updates = True
            
            if "types" not in stats:
                stats["types"] = {"bunk": 0, "late_arrival": 0, "dress_code": 0}
                stats_updates = True
            else:
                if "bunk" not in stats["types"]:
                    stats["types"]["bunk"] = 0
                    stats_updates = True
                if "late_arrival" not in stats["types"]:
                    stats["types"]["late_arrival"] = 0
                    stats_updates = True
                if "dress_code" not in stats["types"]:
                    stats["types"]["dress_code"] = 0
                    stats_updates = True
            
            if stats_updates:
                updates["stats"] = stats
                missing_fields.append("stats (partial)")

        # 4. Timestamps
        now_utc = datetime.now(timezone.utc)
        if "created_at" not in student:
            updates["created_at"] = now_utc
            missing_fields.append("created_at")
        if "updated_at" not in student:
            updates["updated_at"] = now_utc
            missing_fields.append("updated_at")

        # Apply updates if necessary
        if updates:
            # Ensure updated_at is refreshed whenever a document is modified
            if "updated_at" not in updates:
                updates["updated_at"] = now_utc
            
            print(f"Repairing student_id: {student_id} | Missing/Invalid: {', '.join(missing_fields)}")
            students_col.update_one({"_id": student["_id"]}, {"$set": updates})
            repaired_count += 1
            
    print(f"\nValidation complete. Checked: {total_students}, Repaired: {repaired_count}.")

if __name__ == "__main__":
    validate_and_repair_students()
