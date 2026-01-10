#!/usr/bin/env python3
"""
Train an OpenCV LBPH face recognizer from registered student images.
Enhanced with preprocessing, detection, and model parameters for improved accuracy.

DATA SEPARATION PRINCIPLE:
- storage/training/  -> Student registration images (used to train LBPH model)
- storage/uploads/   -> Captured images during bunk checking (used for matching only)
This separation prevents overfitting and ensures reliable face recognition accuracy.

IMPROVEMENTS FOR ACCURACY:
1. Face Preprocessing:
   - Convert to grayscale for consistency
   - Resize to 200x200 for LBPH training
   - Apply CLAHE (contrast-limited adaptive histogram equalization)
     to normalize lighting conditions and improve face distinctiveness
   
2. Face Detection:
   - Haar Cascade with scaleFactor=1.1, minNeighbors=7, minSize=(80,80)
   - Reject images with 0 or >1 face (ambiguous)
   - Only use images with exactly one clear face
   
3. Training Data Quality:
   - Require minimum 2 training images per student
   - Skip students with fewer than 2 valid face images
   - Ensures the model learns variation in face appearance
   
4. LBPH Model Parameters:
   - radius=2, neighbors=16, grid_x=8, grid_y=8
   - Balanced parameters for local binary patterns
   - grid_x/grid_y=8 provides fine spatial discrimination

Behavior:
- Connects to MongoDB and reads `students` collection.
- For each student, gathers images from `backend/storage/training`.
- Detects faces using improved Haar Cascade parameters.
- Applies CLAHE preprocessing to each face.
- Trains LBPH with enhanced parameters.
- Saves trained model to `backend/model.yml` and label mapping to `backend/labels.json`.

IMPORTANT: Do NOT mix training (storage/training) and test (storage/uploads) data.
Train only on registered student images, never on captured violation images.

Requirements:
- OpenCV with contrib (`opencv-contrib-python`) for `cv2.face` LBPH recognizer.
- A running MongoDB with the same `MONGO_URL` used by the app.

Usage:
    python train_lbph.py

"""
import os
import sys
import json
import cv2
import numpy as np
from pathlib import Path
from pymongo import MongoClient
from dotenv import load_dotenv

ROOT = Path(__file__).parent
# Separate training folder contains only registered student face images
STORAGE_TRAINING = ROOT / 'storage' / 'training'
MODEL_PATH = ROOT / 'model.yml'
LABELS_PATH = ROOT / 'labels.json'
HAAR = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'

# Load env
load_dotenv(ROOT / '.env')
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
DB_NAME = os.environ.get('DB_NAME', 'attendguard')

def get_db():
    client = MongoClient(MONGO_URL)
    return client[DB_NAME]


def preprocess_face(face_gray):
    """Apply CLAHE to normalize lighting and enhance face features.
    
    CLAHE (Contrast Limited Adaptive Histogram Equalization) improves
    recognition by normalizing lighting variations across different capture
    conditions, making face features more distinctive to the LBPH recognizer.
    """
    try:
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        face_clahe = clahe.apply(face_gray)
        return face_clahe
    except Exception:
        return face_gray


def detect_and_prepare_face(img_path, scale=1.1, minNeighbors=7, minSize=(80, 80)):
    """Detect and preprocess face from image file.
    
    Only accepts images with exactly ONE face (rejects 0 or >1).
    Returns preprocessed 200x200 face or None on failure.
    
    Improved parameters:
    - scaleFactor=1.1: balance between speed and accuracy
    - minNeighbors=7: stricter (fewer false positives than default 5)
    - minSize=(80,80): ignore very small faces (likely false positives)
    """
    try:
        img = cv2.imread(str(img_path))
        if img is None:
            return None
        
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        detector = cv2.CascadeClassifier(HAAR)
        
        # Detect faces with improved parameters
        faces = detector.detectMultiScale(
            gray,
            scaleFactor=scale,
            minNeighbors=minNeighbors,
            minSize=minSize
        )
        
        # Reject images with 0 or >1 face: we need exactly one clear face per image
        if len(faces) != 1:
            return None
        
        x, y, w, h = faces[0]
        face = gray[y:y+h, x:x+w]
        
        # Resize to 200x200 (standard for LBPH training)
        face = cv2.resize(face, (200, 200))
        
        # Apply CLAHE preprocessing to normalize lighting
        face = preprocess_face(face)
        
        return face
    except Exception:
        return None


def gather_training_data(db):
    """Collect training images and labels from storage/training using students collection.
    
    NEW STRUCTURE (Multi-angle registration):
    - Reads from: storage/training/<student_id>/{front.jpg, left.jpg, right.jpg, smile.jpg, ...}
    - Multiple images per student for training robustness (different angles/expressions)
    
    BACKWARD COMPATIBILITY:
    - Still reads flat structure: storage/training/<student_id>_*.jpg (old format)
    - Supports single image field in DB for existing students
    
    QUALITY REQUIREMENTS:
    - Require minimum 3 images per student (3+ angles improves LBPH robustness significantly)
    - For demo/test: can lower to 1+ via MIN_TRAINING_IMAGES env var
    - Reject images with 0 or >1 face (accept only clear, unambiguous faces)
    - Only use images with exactly one clear face (via detect_and_prepare_face)
    
    This ensures the model learns meaningful patterns in face appearance
    across different angles, rather than memorizing a single image.
    
    IMPORTANT: Only reads from STORAGE_TRAINING folder (registered student images).
    Never includes images from storage/uploads (captured violation images).
    This ensures the LBPH model is trained on clean, consistent, registered face data.
    """
    students = list(db.students.find())
    images = []
    labels = []
    label_map = {}
    next_label = 0
    
    students_processed = 0
    students_skipped = 0
    
    # For production, set to 3+ for multi-angle robustness; for demo, can use 1
    MIN_IMAGES_PER_STUDENT = int(os.environ.get('MIN_TRAINING_IMAGES', '3'))

    for s in students:
        sid = s.get('student_id')
        if not sid:
            continue
        
        # Check for NEW structure: storage/training/<student_id>/ subdirectory
        student_subdir = STORAGE_TRAINING / sid
        matches = []
        
        if student_subdir.is_dir():
            # NEW: read all images from per-student subdirectory
            matches = list(student_subdir.glob('*'))
        
        # BACKWARD COMPATIBILITY: also check for flat structure storage/training/<student_id>_*
        if not matches:
            matches = list(STORAGE_TRAINING.glob(f"{sid}_*"))
        
        # Also check single image field in DB if present (old format)
        if not matches:
            img_field = s.get('image')
            if img_field:
                p = STORAGE_TRAINING / img_field
                if p.exists():
                    matches = [p]

        if not matches:
            continue

        # Try to extract valid faces from this student's images
        valid_faces = []
        for img_path in matches:
            try:
                face = detect_and_prepare_face(img_path)
                if face is not None:
                    valid_faces.append(face)
            except Exception:
                continue
        
        # QUALITY CHECK: require at least MIN_IMAGES_PER_STUDENT valid training images
        if len(valid_faces) < MIN_IMAGES_PER_STUDENT:
            students_skipped += 1
            continue
        
        # Assign label
        label_map[str(next_label)] = sid
        
        # Add all valid faces for this student to training set
        for face in valid_faces:
            images.append(face)
            labels.append(next_label)
        
        students_processed += 1
        next_label += 1

    return images, labels, label_map, students_processed, students_skipped


def train_and_save(images, labels, label_map, students_processed, students_skipped):
    if not images or not labels:
        print('No training data found. Register students and upload their images to storage/training.')
        print('QUALITY REQUIREMENT: Each student needs at least 2 valid face images.')
        return False

    # create recognizer with enhanced parameters for improved accuracy
    try:
        if hasattr(cv2, 'face') and hasattr(cv2.face, 'LBPHFaceRecognizer_create'):
            # Enhanced LBPH parameters:
            # - radius=2: neighborhood radius for LBP computation
            # - neighbors=16: number of neighbors in the LBP (typically 8 or 16)
            # - grid_x=8, grid_y=8: spatial grid (higher = more local patterns = better discrimination)
            recognizer = cv2.face.LBPHFaceRecognizer_create(
                radius=2,
                neighbors=16,
                grid_x=8,
                grid_y=8
            )
        else:
            # fallback lookup
            recognizer = getattr(cv2, 'LBPHFaceRecognizer_create', None)
            if recognizer:
                recognizer = recognizer()
            else:
                print('LBPH recognizer not available. Install opencv-contrib-python.')
                return False
    except Exception as e:
        print('Failed to create LBPH recognizer:', e)
        return False

    print(f'Training on {len(images)} preprocessed faces across {len(set(labels))} students...')
    print(f'Students with >=2 valid images: {students_processed}')
    print(f'Students skipped (insufficient images): {students_skipped}')
    
    recognizer.train(images, np.array(labels, dtype=np.int32))

    recognizer.write(str(MODEL_PATH))
    with open(LABELS_PATH, 'w') as fh:
        json.dump(label_map, fh)

    print('Training complete. Model saved to', MODEL_PATH)
    print('Labels mapping saved to', LABELS_PATH)
    print(f'Model parameters: radius=2, neighbors=16, grid_x=8, grid_y=8')
    return True


if __name__ == '__main__':
    db = get_db()
    imgs, labs, lm, proc, skip = gather_training_data(db)
    ok = train_and_save(imgs, labs, lm, proc, skip)
    if not ok:
        sys.exit(2)
    sys.exit(0)
