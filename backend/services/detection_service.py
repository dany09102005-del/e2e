import numpy as np
import face_recognition
from services.student_service import StudentService
from config import Config

class DetectionService:
    @staticmethod
    def match_face(image_path, department=None, section=None):
        """
        Match a captured face against students in a specific department and section.
        """
        # Load image
        try:
            image = face_recognition.load_image_file(image_path)
        except Exception as e:
            return {"success": False, "error": f"Failed to load image: {str(e)}"}

        # Detect face and encoding
        face_locations = face_recognition.face_locations(image)
        if len(face_locations) == 0:
            return {"success": False, "matched": False, "error": "No face detected"}
        if len(face_locations) > 1:
            return {"success": False, "matched": False, "error": "Multiple faces detected"}

        encodings = face_recognition.face_encodings(image)
        if not encodings:
            return {"success": False, "matched": False, "error": "Failed to extract encoding"}
        
        captured_encoding = encodings[0]

        # Get candidates (optimized)
        candidates = StudentService.get_students_for_matching(department, section)
        if not candidates:
            return {"success": True, "matched": False, "message": "No registered students in chosen area"}

        best_match = None
        best_distance = float('inf')

        for student in candidates:
            stored_embedding = student.get("face", {}).get("embedding")
            if not stored_embedding:
                continue
            
            # Compute distance
            dist = np.linalg.norm(np.array(captured_encoding) - np.array(stored_embedding))
            if dist < best_distance:
                best_distance = dist
                best_match = student

        # Result based on threshold
        if best_match and best_distance < Config.FACE_DISTANCE_THRESHOLD:
            confidence = round((1 - best_distance) * 100, 2)
            return {
                "success": True,
                "matched": True,
                "student": {
                    "roll_no": best_match["roll_no"],
                    "name": best_match["name"],
                    "department": best_match.get("department", "CSE"),
                    "section": best_match.get("section", "A"),
                    "violations_count": best_match.get("violations_count", 0)
                },
                "confidence": confidence,
                "distance": float(best_distance)
            }
            
        return {
            "success": True,
            "matched": False,
            "message": "No match found above confidence threshold"
        }
