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

    @staticmethod
    def get_student_analytics(roll_no):
        db = get_db()
        from datetime import datetime
        
        # 1. Base details and Total
        student = db.students.find_one({"roll_no": roll_no})
        if not student:
            return None
            
        total_violations = student.get("violations_count", 0)
        
        # 2. Monthly Trend (Trailing 12 months)
        monthly_pipeline = [
            {"$match": {"roll_no": roll_no}},
            {
                "$group": {
                    "_id": {"$month": "$created_at"},
                    "count": {"$sum": 1}
                }
            }
        ]
        month_aggregates = list(db.violations.aggregate(monthly_pipeline))
        
        month_map = {
            1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "May", 6: "Jun",
            7: "Jul", 8: "Aug", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec"
        }
        
        current_month = datetime.utcnow().month
        chart_labels = []
        chart_data = []
        
        for i in range(11, -1, -1):
            m = current_month - i
            if m <= 0:
                m += 12
            chart_labels.append(month_map[m])
            matched_count = next((item['count'] for item in month_aggregates if item['_id'] == m), 0)
            chart_data.append(matched_count)
            
        # 3. Violation Breakdown
        breakdown_pipeline = [
            {"$match": {"roll_no": roll_no}},
            {
                "$group": {
                    "_id": "$type",
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"count": -1}}
        ]
        breakdown_agg = list(db.violations.aggregate(breakdown_pipeline))
        breakdown = {doc["_id"]: doc["count"] for doc in breakdown_agg if doc["_id"]}

        # 4. Timeline (Sorted by created_at DESC)
        timeline_cursor = db.violations.find({"roll_no": roll_no}).sort("created_at", -1)
        timeline = []
        
        for t in timeline_cursor:
            # Format nicely for the UI frontend "Oct 12, 2023"
            dt = t.get("created_at")
            formatted_date = ""
            if dt:
                formatted_date = dt.strftime("%b %d, %Y")
                
            timeline.append({
                "id": str(t["_id"]),
                "type": t.get("type", "Unknown"),
                "date": formatted_date,
                "remark": t.get("remarks", "No remarks provided."),
                "location": t.get("location", "Unknown Location"),
                "status": t.get("status", "Pending")
            })

        return {
            "total": total_violations,
            "monthly_counts": {
                "labels": chart_labels,
                "data": chart_data
            },
            "breakdown": breakdown,
            "timeline": timeline
        }
