from datetime import datetime
from db import get_db
from utils.normalization import to_plain_list

class StudentService:
    @staticmethod
    def create_student(student_data):
        db = get_db()
        from config import Config
        from pathlib import Path
        import os
        
        # Initialize stats as flat counts
        student_data["violations_count"] = 0
        student_data["late_count"] = 0
        student_data["bunk_count"] = 0
        student_data["dress_code_count"] = 0
        
        # Clean and Normalize Required Fields
        roll_no = str(student_data.get("roll_no", "")).strip().upper()
        if not roll_no:
            raise ValueError("Roll number is required")
            
        student_data["roll_no"] = roll_no
        
        student_data["name"] = str(student_data.get("name", "")).strip().title()
        dept = str(student_data.get("department", "CSE")).strip().upper()
        section = str(student_data.get("section", "A")).strip().upper()
        
        student_data["department"] = dept
        student_data["section"] = section
        
        # Consolidate and nest contact info
        student_data["contact_info"] = {
            "phone": str(student_data.pop("phone", "")).strip(),
            "email": str(student_data.pop("email", "")).strip()
        }
        
        # Ensure hierarchy exists in storage/training
        storage_path = Path(Config.STORAGE_TRAINING) / dept / section / roll_no
        storage_path.mkdir(parents=True, exist_ok=True)
        
        # Handle face status
        if "face" not in student_data:
            student_data["face"] = {
                "image_filenames": [],
                "embedding": [],
                "status": "pending_image"
            }
        else:
            # Normalize embedding
            if "embedding" in student_data["face"]:
                student_data["face"]["embedding"] = to_plain_list(student_data["face"]["embedding"])
                if student_data["face"]["embedding"]:
                    student_data["face"]["status"] = "active"
                else:
                    student_data["face"]["status"] = "pending_image"

        student_data["created_at"] = datetime.utcnow()
        student_data["updated_at"] = datetime.utcnow()
        
        result = db.students.insert_one(student_data)
        return str(result.inserted_id)

    @staticmethod
    def get_students(filters=None):
        db = get_db()
        students = list(db.students.find(filters or {}))
        for student in students:
            student["_id"] = str(student["_id"])
        return students

    @staticmethod
    def get_students_for_matching(department=None, section=None):
        """
        Optimized loading: get only students with embeddings in targeted dept/section.
        """
        query = {"face.embedding": {"$exists": True, "$ne": []}}
        if department:
            query["department"] = department.upper()
        if section:
            query["section"] = section.upper()
            
        return StudentService.get_students(query)

    @staticmethod
    def update_student_face(roll_no, embedding, image_filename):
        db = get_db()
        from config import Config
        from pathlib import Path
        
        student = db.students.find_one({"roll_no": roll_no})
        if not student:
            return
            
        dept = student.get("department", "CSE").upper()
        section = student.get("section", "A").upper()
        
        # Ensure path exists (should already exist from create_student, but safety first)
        storage_path = Path(Config.STORAGE_TRAINING) / dept / section / roll_no
        storage_path.mkdir(parents=True, exist_ok=True)
        
        # Note: In a real system, we'd move the image from a temp location here
        # or have the route pass the path. For now, we assume the filename is enough
        # as it will be scanned by sync_storage later or handled by the route.

        db.students.update_one(
            {"roll_no": roll_no},
            {
                "$set": {
                    "face.embedding": to_plain_list(embedding),
                    "face.status": "active",
                    "updated_at": datetime.utcnow()
                },
                "$addToSet": {"face.image_filenames": image_filename}
            }
        )
