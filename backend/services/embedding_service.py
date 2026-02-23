from datetime import datetime
import face_recognition
from pathlib import Path
from db import get_db
from config import Config
from services.student_service import StudentService

class FaceEmbeddingService:
    @staticmethod
    def process_all_pending():
        """
        Scan students with pending_image status, locate their images in hierarchy,
        and generate averaged embeddings.
        """
        db = get_db()
        pending_students = list(db.students.find({"face.status": "pending_image"}))
        
        results = {"success": 0, "failed": 0}
        
        for student in pending_students:
            sid = student["student_id"]
            dept = student.get("department", "CSE")
            section = student.get("section", "A")
            
            student_dir = Path(Config.STORAGE_TRAINING) / dept / section / sid
            if not student_dir.exists():
                print(f"Warning: Directory not found for {sid} at {student_dir}")
                results["failed"] += 1
                continue
            
            # Load images and get encodings
            encodings = []
            for img_path in student_dir.iterdir():
                if img_path.is_file() and img_path.suffix.lower() in {'.jpg', '.jpeg', '.png'}:
                    try:
                        image = face_recognition.load_image_file(str(img_path))
                        img_encodings = face_recognition.face_encodings(image)
                        if img_encodings:
                            encodings.append(img_encodings[0])
                    except Exception as e:
                        print(f"Error processing {img_path}: {e}")

            if not encodings:
                print(f"No valid encodings found for {sid}")
                results["failed"] += 1
                continue
            
            # Average encodings (Centroid)
            import numpy as np
            avg_encoding = np.mean(encodings, axis=0).tolist()
            
            # Update student
            # We already have update_student_face in StudentService
            # but it appends the filename. Here we might want something cleaner.
            db.students.update_one(
                {"student_id": sid},
                {
                    "$set": {
                        "face.embedding": avg_encoding,
                        "face.status": "active",
                        "updated_at": datetime.utcnow() if 'datetime' in globals() else None
                    }
                }
            )
            results["success"] += 1
            print(f"Generated embedding for {sid} ({len(encodings)} images)")
            
        return results
