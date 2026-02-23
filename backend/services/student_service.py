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
        
        # Initialize stats
        student_data["stats"] = {
            "total": 0,
            "types": {
                "bunk": 0,
                "late_arrival": 0,
                "dress_code": 0
            }
        }
        
        # Ensure hierarchy exists in storage/training
        dept = student_data.get("department", "CSE").upper()
        section = student_data.get("section", "A").upper()
        sid = student_data.get("student_id")
        
        if sid:
            storage_path = Path(Config.STORAGE_TRAINING) / dept / section / sid
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
    def update_student_face(student_id, embedding, image_filename):
        db = get_db()
        from config import Config
        from pathlib import Path
        
        student = db.students.find_one({"student_id": student_id})
        if not student:
            return
            
        dept = student.get("department", "CSE").upper()
        section = student.get("section", "A").upper()
        
        # Ensure path exists (should already exist from create_student, but safety first)
        storage_path = Path(Config.STORAGE_TRAINING) / dept / section / student_id
        storage_path.mkdir(parents=True, exist_ok=True)
        
        # Note: In a real system, we'd move the image from a temp location here
        # or have the route pass the path. For now, we assume the filename is enough
        # as it will be scanned by sync_storage later or handled by the route.

        db.students.update_one(
            {"student_id": student_id},
            {
                "$set": {
                    "face.embedding": to_plain_list(embedding),
                    "face.status": "active",
                    "updated_at": datetime.utcnow()
                },
                "$addToSet": {"face.image_filenames": image_filename}
            }
        )
