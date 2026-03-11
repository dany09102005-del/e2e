import numpy as np
import face_recognition
import cv2
from services.student_service import StudentService
from config import Config

class DetectionService:
    # Tunable thresholds
    BLUR_THRESHOLD_SEVERE = 10.0
    BLUR_THRESHOLD_MILD = 50.0
    MIN_FACE_WIDTH = 40
    UPSCALE_FACTOR = 1.5
    DOWNSCALE_FACTOR = 0.8

    @staticmethod
    def _calculate_blur(image):
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        else:
            gray = image
        return cv2.Laplacian(gray, cv2.CV_64F).var()

    @staticmethod
    def _normalize_contrast(image):
        if len(image.shape) == 3:
            lab = cv2.cvtColor(image, cv2.COLOR_RGB2LAB)
            l, a, b = cv2.split(lab)
            cl = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(l)
            limg = cv2.merge((cl, a, b))
            return cv2.cvtColor(limg, cv2.COLOR_LAB2RGB)
        else:
            return cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(image)

    @staticmethod
    def match_face(image_path, department=None, section=None):
        """
        Match a captured face with blur handling, scale handling, and strict thresholds.
        """
        # 1. Load image
        try:
            image = face_recognition.load_image_file(image_path)
            original_h, original_w = image.shape[:2]
        except Exception as e:
            return {"success": False, "matched": False, "error": f"Failed to load image: {str(e)}"}

        # 2. Blur Handling
        blur_val = DetectionService._calculate_blur(image)
        if blur_val < DetectionService.BLUR_THRESHOLD_SEVERE:
            return {
                "success": True, "matched": False, "error": "Image extremely blurry",
                "reason": f"Blur variance {blur_val:.2f} < {DetectionService.BLUR_THRESHOLD_SEVERE}"
            }
        
        if blur_val < DetectionService.BLUR_THRESHOLD_MILD:
            image = DetectionService._normalize_contrast(image)

        # 3. Small/Far Face Handling: Upscale 1.5x before detection
        h, w = image.shape[:2]
        upscale_w = int(w * DetectionService.UPSCALE_FACTOR)
        upscale_h = int(h * DetectionService.UPSCALE_FACTOR)
        upscaled_image = cv2.resize(image, (upscale_w, upscale_h), interpolation=cv2.INTER_CUBIC)

        locations = face_recognition.face_locations(upscaled_image, model="hog")
        if not locations:
            # Fallback to CNN if HOG fails
            locations = face_recognition.face_locations(upscaled_image, model="cnn")

        if len(locations) == 0:
            return {
                "success": True, "matched": False, "error": "No face detected",
                "reason": "Detection failed on upscaled image"
            }
        if len(locations) > 1:
            return {
                "success": True, "matched": False, "error": "Multiple faces detected",
                "reason": f"Found {len(locations)} faces"
            }

        top, right, bottom, left = locations[0]
        face_width_upscaled = right - left
        face_width_original = face_width_upscaled / DetectionService.UPSCALE_FACTOR

        if face_width_original < DetectionService.MIN_FACE_WIDTH:
            return {
                "success": True, "matched": False, "error": "Face too small",
                "reason": f"Face width {face_width_original:.1f}px < {DetectionService.MIN_FACE_WIDTH}px minimum"
            }

        # Encode face using 'large' model
        encodings = face_recognition.face_encodings(upscaled_image, known_face_locations=locations, model="large")
        if not encodings:
            return {
                "success": True, "matched": False, "error": "Failed to extract encoding",
                "reason": "Encoding failed after valid detection"
            }
        
        captured_encoding = encodings[0]

        # 4. Candidates Selection
        candidates = StudentService.get_students_for_matching(department, section)
        if not candidates:
            return {
                "success": True, "matched": False, "error": "No candidates",
                "reason": "No registered students in chosen area"
            }

        threshold = getattr(Config, 'FACE_DISTANCE_THRESHOLD', 0.5)

        def find_best_match(target_encoding):
            b_match = None
            b_dist = float('inf')
            for student in candidates:
                stored_embedding = student.get("face", {}).get("embedding")
                if not stored_embedding:
                    continue
                dist = np.linalg.norm(np.array(target_encoding) - np.array(stored_embedding))
                if dist < b_dist:
                    b_dist = dist
                    b_match = student
            return b_match, b_dist

        best_match, best_distance = find_best_match(captured_encoding)

        # 5. Matching Logic: Multi-pass fallback strategy
        if best_distance >= threshold:
            # Downscale original image and retry processing
            downscale_w = int(original_w * DetectionService.DOWNSCALE_FACTOR)
            downscale_h = int(original_h * DetectionService.DOWNSCALE_FACTOR)
            downscaled_image = cv2.resize(image, (downscale_w, downscale_h), interpolation=cv2.INTER_AREA)

            downscaled_locations = face_recognition.face_locations(downscaled_image, model="hog")
            if not downscaled_locations:
                downscaled_locations = face_recognition.face_locations(downscaled_image, model="cnn")
            
            if len(downscaled_locations) == 1:
                down_encodings = face_recognition.face_encodings(downscaled_image, known_face_locations=downscaled_locations, model="large")
                if down_encodings:
                    retry_match, retry_distance = find_best_match(down_encodings[0])
                    if retry_distance < best_distance:
                        best_distance = retry_distance
                        best_match = retry_match

        # Construct final structured response
        if best_match is not None:
            confidence = round((1 - best_distance) * 100, 2)
            matched = bool(best_distance < threshold)
            
            response = {
                "success": True,
                "matched": matched,
                "confidence": confidence,
                "distance": float(best_distance),
                "threshold": float(threshold),
                "reason": "Match successful" if matched else "Distance above strict threshold"
            }
            if matched:
                response["student"] = {
                    "roll_no": best_match["roll_no"],
                    "name": best_match["name"],
                    "department": best_match.get("department", "CSE"),
                    "section": best_match.get("section", "A"),
                    "violations_count": best_match.get("violations_count", 0)
                }
            return response
            
        return {
            "success": True,
            "matched": False,
            "distance": None,
            "threshold": float(threshold),
            "reason": "No match found above confidence threshold"
        }
