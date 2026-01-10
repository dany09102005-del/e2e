#!/usr/bin/env python3
"""
Compute stable student embeddings by averaging face encodings across multiple training images.

For each student in storage/training/<student_id>/:
1. Load all images in the subdirectory
2. Extract face encodings from each image
3. Average the encodings for stability
4. Store the averaged embedding in MongoDB

This produces more robust embeddings than single-image extraction, as they capture
the variation in a student's face across different angles and expressions.

Usage:
    python compute_student_embeddings.py
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
    """Apply CLAHE to normalize lighting and enhance face features."""
    try:
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        face_clahe = clahe.apply(face_gray)
        return face_clahe
    except Exception:
        return face_gray


def detect_and_extract_face(img_path):
    """Detect and extract face from image.
    
    Returns preprocessed 200x200 face or None on failure.
    Only accepts images with exactly ONE face.
    """
    try:
        img = cv2.imread(str(img_path))
        if img is None:
            return None
        
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        detector = cv2.CascadeClassifier(HAAR)
        
        # Detect faces with strict parameters
        faces = detector.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=7,
            minSize=(80, 80)
        )
        
        # Reject images with 0 or >1 face
        if len(faces) != 1:
            return None
        
        x, y, w, h = faces[0]
        face = gray[y:y+h, x:x+w]
        
        # Resize to 200x200
        face = cv2.resize(face, (200, 200))
        
        # Apply CLAHE preprocessing
        face = preprocess_face(face)
        
        return face
    except Exception:
        return None


def image_to_embedding_openCV(face_gray):
    """Extract embedding using OpenCV (fallback method).
    
    Normalizes the face image and returns a flattened vector.
    """
    try:
        # Normalize to 0-1 range
        face_normalized = face_gray.astype('float32') / 255.0
        # Flatten to 1D vector
        embedding = face_normalized.flatten()
        return embedding.tolist()
    except Exception:
        return None


def try_face_recognition_embedding(img_path):
    """Try to extract embedding using face_recognition library.
    
    Returns None if face_recognition is not available or fails.
    """
    try:
        # Lazy import to avoid startup issues
        import io
        import sys as sys_module
        old_stderr = sys_module.stderr
        sys_module.stderr = io.StringIO()
        try:
            import face_recognition
            sys_module.stderr = old_stderr
            
            image = face_recognition.load_image_file(str(img_path))
            face_encodings = face_recognition.face_encodings(image)
            
            if face_encodings:
                return face_encodings[0].tolist()
        except Exception:
            sys_module.stderr = old_stderr
            return None
    except Exception:
        return None


def compute_student_embedding(student_dir):
    """Compute averaged embedding for a student from all their training images.
    
    Returns dict with:
    - embedding: averaged embedding vector
    - num_images: number of images used
    - valid_faces: number of valid face detections
    """
    if not student_dir.is_dir():
        return None
    
    embeddings = []
    valid_faces = 0
    image_count = 0
    
    # Load all images in the student's subdirectory
    image_paths = sorted(student_dir.glob('*'))
    
    for img_path in image_paths:
        # Skip non-image files
        if not img_path.suffix.lower() in ['.jpg', '.jpeg', '.png', '.bmp']:
            continue
        
        image_count += 1
        
        # Extract face from image
        face = detect_and_extract_face(img_path)
        if face is None:
            continue
        
        valid_faces += 1
        
        # Try face_recognition first (better quality if available)
        embedding = try_face_recognition_embedding(img_path)
        
        # Fallback to OpenCV embedding
        if embedding is None:
            embedding = image_to_embedding_openCV(face)
        
        if embedding is not None:
            embeddings.append(embedding)
    
    if not embeddings:
        return None
    
    # Average embeddings for stability
    avg_embedding = np.mean(embeddings, axis=0).tolist()
    
    return {
        'embedding': avg_embedding,
        'num_images': image_count,
        'valid_faces': valid_faces,
        'num_embeddings': len(embeddings)
    }


def update_student_embeddings(db):
    """Compute and store averaged embeddings for all students."""
    students = list(db.students.find())
    
    updated_count = 0
    failed_count = 0
    
    print(f"\n📊 Computing averaged embeddings for {len(students)} students...")
    
    for student in students:
        student_id = student.get('student_id')
        
        # Check for per-student subdirectory
        student_dir = STORAGE_TRAINING / student_id
        
        if not student_dir.is_dir():
            print(f"  ⚠️  {student_id}: No training directory found")
            failed_count += 1
            continue
        
        # Compute averaged embedding
        result = compute_student_embedding(student_dir)
        
        if result is None:
            print(f"  ✗ {student_id}: Failed to extract valid faces")
            failed_count += 1
            continue
        
        # Update MongoDB with averaged embedding
        db.students.update_one(
            {'_id': student['_id']},
            {
                '$set': {
                    'embedding': result['embedding'],
                    'embedding_metadata': {
                        'num_images': result['num_images'],
                        'valid_faces': result['valid_faces'],
                        'num_embeddings': result['num_embeddings'],
                        'method': 'averaged'
                    }
                }
            }
        )
        
        print(f"  ✓ {student_id}: {result['num_embeddings']} embeddings averaged "
              f"(from {result['valid_faces']}/{result['num_images']} images)")
        updated_count += 1
    
    print(f"\n✅ Embedding computation complete!")
    print(f"   Updated: {updated_count}/{len(students)}")
    print(f"   Failed: {failed_count}/{len(students)}")
    
    return updated_count, failed_count


if __name__ == '__main__':
    db = get_db()
    updated, failed = update_student_embeddings(db)
    
    if failed > 0:
        sys.exit(1)
    
    sys.exit(0)
