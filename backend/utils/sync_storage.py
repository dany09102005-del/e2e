import os
import sys
from pathlib import Path
from datetime import datetime

# Add parent directory to path to allow importing from backend root
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from db import get_db
from config import Config

def sync_hierarchical_storage():
    """
    Scan storage/training/<DEPT>/<SECTION>/<STUDENT_ID>/ structure
    and sync with GuardDB.
    """
    db = get_db()
    training_root = Path(Config.STORAGE_TRAINING)
    
    if not training_root.exists():
        print(f"Error: Training root {training_root} does not exist.")
        return

    print(f"Starting sync from: {training_root}")
    
    # Allowed values for validation
    ALLOWED_DEPTS = {"CSE", "ECE", "MECH", "CIVIL"}
    ALLOWED_SECTIONS = {"A", "B", "C"}

    for dept_path in training_root.iterdir():
        if not dept_path.is_dir():
            continue
            
        dept = dept_path.name.upper()
        if dept not in ALLOWED_DEPTS:
            print(f"Warning: Skipping invalid department folder: {dept}")
            continue

        for section_path in dept_path.iterdir():
            if not section_path.is_dir():
                continue
                
            section = section_path.name.upper()
            if section not in ALLOWED_SECTIONS:
                print(f"Warning: Skipping invalid section folder: {section} in {dept}")
                continue

            for student_path in section_path.iterdir():
                if not student_path.is_dir():
                    continue
                
                student_id = student_path.name
                
                # Get image filenames
                images = [f.name for f in student_path.iterdir() if f.is_file() and f.suffix.lower() in {'.jpg', '.jpeg', '.png'}]
                
                if not images:
                    print(f"Warning: No images found for student {student_id} in {dept}/{section}")
                    continue

                # Prepare student document
                existing = db.students.find_one({"student_id": student_id})
                
                if existing:
                    # Update only if needed
                    update_fields = {
                        "department": dept,
                        "section": section,
                        "face.image_filenames": images,
                        "updated_at": datetime.utcnow()
                    }
                    db.students.update_one({"student_id": student_id}, {"$set": update_fields})
                    print(f"Updated: {student_id} ({dept}/{section})")
                else:
                    # Create new student
                    new_student = {
                        "student_id": student_id,
                        "department": dept,
                        "section": section,
                        "face": {
                            "image_filenames": images,
                            "embedding": [],
                            "status": "pending_image"
                        },
                        "stats": {
                            "total": 0,
                            "types": {
                                "bunk": 0,
                                "late_arrival": 0,
                                "dress_code": 0
                            }
                        },
                        "created_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                    db.students.insert_one(new_student)
                    print(f"Registered: {student_id} ({dept}/{section})")

if __name__ == "__main__":
    sync_hierarchical_storage()
