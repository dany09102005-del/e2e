#!/usr/bin/env python3
"""
Train an OpenCV LBPH face recognizer from registered student images.

DATA SEPARATION PRINCIPLE:
- storage/training/  -> Student registration images (used to train LBPH model)
- storage/uploads/   -> Captured images during bunk checking (used for matching only)
This separation prevents overfitting and ensures reliable face recognition accuracy.

Behavior:
- Connects to MongoDB and reads `students` collection.
- For each student, gathers images from `backend/storage/training` that start with the student's `student_id` prefix.
  (E.g., 23BQ1A05A9_demo.jpg, or multiple: 23BQ1A05A9_1.jpg, 23BQ1A05A9_2.jpg)
- Detects faces using Haar Cascade, crops and resizes them to 200x200 grayscale.
- Maps each `student_id` to a numeric label and trains the LBPH recognizer.
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


def detect_and_prepare_face(img_gray, scale=1.1):
    """Detect largest face in grayscale image, crop and resize to 200x200.

    Returns the processed face or None.
    """
    try:
        detector = cv2.CascadeClassifier(HAAR)
        faces = detector.detectMultiScale(img_gray, scaleFactor=scale, minNeighbors=5)
        if len(faces) == 0:
            return None
        # choose largest face
        x, y, w, h = max(faces, key=lambda r: r[2] * r[3])
        face = img_gray[y:y+h, x:x+w]
        face = cv2.resize(face, (200, 200))
        return face
    except Exception:
        return None


def gather_training_data(db):
    """Collect training images and labels from storage/training using students collection.
    
    IMPORTANT: Only reads from STORAGE_TRAINING folder (registered student images).
    Never includes images from storage/uploads (captured violation images).
    This ensures the LBPH model is trained on clean, consistent, registered face data.
    """
    students = list(db.students.find())
    images = []
    labels = []
    label_map = {}
    next_label = 0

    for s in students:
        sid = s.get('student_id')
        if not sid:
            continue
        # find files in STORAGE_TRAINING starting with sid + '_'
        matches = list(STORAGE_TRAINING.glob(f"{sid}_*"))
        # also include single image field if present
        img_field = s.get('image')
        if img_field:
            # Image path stored in DB should refer to training images.
            p = STORAGE_TRAINING / img_field
            if p.exists() and p not in matches:
                matches.append(p)

        if not matches:
            continue

        # assign label
        label_map[str(next_label)] = sid

        for p in matches:
            try:
                data = cv2.imdecode(np.fromfile(str(p), dtype=np.uint8), cv2.IMREAD_COLOR)
                if data is None:
                    # fallback to read via imread
                    data = cv2.imread(str(p))
                if data is None:
                    continue
                gray = cv2.cvtColor(data, cv2.COLOR_BGR2GRAY)
                face = detect_and_prepare_face(gray)
                if face is None:
                    continue
                images.append(face)
                labels.append(next_label)
            except Exception as e:
                print(f"Warning: failed to process {p}: {e}")
        next_label += 1

    return images, labels, label_map


def train_and_save(images, labels, label_map):
    if not images or not labels:
        print('No training data found. Register students and upload their images to storage/training.')
        return False

    # create recognizer
    try:
        if hasattr(cv2, 'face') and hasattr(cv2.face, 'LBPHFaceRecognizer_create'):
            recognizer = cv2.face.LBPHFaceRecognizer_create()
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

    print(f'Training on {len(images)} faces across {len(set(labels))} labels...')
    recognizer.train(images, np.array(labels, dtype=np.int32))

    recognizer.write(str(MODEL_PATH))
    with open(LABELS_PATH, 'w') as fh:
        json.dump(label_map, fh)

    print('Training complete. Model saved to', MODEL_PATH)
    print('Labels mapping saved to', LABELS_PATH)
    return True


if __name__ == '__main__':
    db = get_db()
    imgs, labs, lm = gather_training_data(db)
    ok = train_and_save(imgs, labs, lm)
    if not ok:
        sys.exit(2)
    sys.exit(0)
