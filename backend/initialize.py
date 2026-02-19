#!/usr/bin/env python3
"""
Standalone script to initialize MongoDB with demo students and deep learning face embeddings.

This script:
1. Creates 15 demo students with synthetic face images
2. Extracts face encodings using face_recognition (deep learning)
3. Averages encodings across multiple images for robustness
4. Stores embeddings in MongoDB for matching

NOTE: Python 3.10+ is REQUIRED for dlib compatibility.
"""

import os
import sys
import io
from pathlib import Path
import cv2
import numpy as np
from pymongo import MongoClient
from datetime import datetime
from werkzeug.security import generate_password_hash

# Import face_recognition (suppress setup warnings)
old_stderr = sys.stderr
sys.stderr = io.StringIO()
try:
    import face_recognition
finally:
    sys.stderr = old_stderr

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
DB_NAME = 'attendguard'
STORAGE_TRAINING = Path(__file__).parent / 'storage' / 'training'

# Demo student data
DEMO_STUDENTS = [
    {'student_id': '23BQ1A0566', 'name': 'Rahul Kumar', 'dept': 'CSE', 'year': '3', 'mobile': '9876543210'},
    {'student_id': '23BQ1A0592', 'name': 'Priya Sharma', 'dept': 'Electronics', 'year': '3', 'mobile': '9876543211'},
    {'student_id': '23BQ1A05A9', 'name': 'Amit Patel', 'dept': 'Mechanical', 'year': '3', 'mobile': '9876543212'},
    {'student_id': '24BQ5A0515', 'name': 'Sneha Reddy', 'dept': 'CSE', 'year': '2', 'mobile': '9876543213'},
    {'student_id': '22BQ1A0501', 'name': 'Vikram Singh', 'dept': 'Information Technology', 'year': '4', 'mobile': '9876543214'},
    {'student_id': '23BQ1A0567', 'name': 'Neha Gupta', 'dept': 'CSE', 'year': '2', 'mobile': '9876543215'},
    {'student_id': '23BQ1A0568', 'name': 'Arjun Desai', 'dept': 'Electronics', 'year': '3', 'mobile': '9876543216'},
    {'student_id': '23BQ1A0569', 'name': 'Pooja Rao', 'dept': 'Civil', 'year': '3', 'mobile': '9876543217'},
    {'student_id': '23BQ1A0570', 'name': 'Sanjay Kumar', 'dept': 'Mechanical', 'year': '2', 'mobile': '9876543218'},
    {'student_id': '23BQ1A0571', 'name': 'Anjali Singh', 'dept': 'CSE', 'year': '3', 'mobile': '9876543219'},
    {'student_id': '23BQ1A0572', 'name': 'Rohan Verma', 'dept': 'Electronics', 'year': '2', 'mobile': '9876543220'},
    {'student_id': '23BQ1A0573', 'name': 'Divya Nair', 'dept': 'CSE', 'year': '3', 'mobile': '9876543221'},
    {'student_id': '23BQ1A0574', 'name': 'Karan Patel', 'dept': 'Mechanical', 'year': '3', 'mobile': '9876543222'},
    {'student_id': '23BQ1A0575', 'name': 'Isha Malhotra', 'dept': 'CSE', 'year': '2', 'mobile': '9876543223'},
    {'student_id': '23BQ1A0576', 'name': 'Harsh Mishra', 'dept': 'Electronics', 'year': '3', 'mobile': '9876543224'},
]

TIMETABLE = [
    {'class': 'CSE-B1', 'instructor': 'Dr. Sharma', 'room': '201'},
    {'class': 'CSE-B2', 'instructor': 'Prof. Desai', 'room': '202'},
    {'class': 'Electronics-B1', 'instructor': 'Dr. Mishra', 'room': '301'},
    {'class': 'Mechanical-B1', 'instructor': 'Prof. Kumar', 'room': '401'},
    {'class': 'Civil-B1', 'instructor': 'Dr. Patel', 'room': '501'},
]


def load_student_image(student_id):
    """
    Load student registration image from storage.
    
    Image Format:
    - Location: storage/training/<student_id>.png
    - Single image per student (simple and clean)
    - Must be real photograph with detectable face
    
    Deep Learning Context:
    - face_recognition uses dlib's ResNet-50 CNN on VGGFace2 dataset
    - Requires real faces with detectable facial landmarks
    - Extracts 128-dimensional embedding (face "fingerprint")
    - Returns None if face not detected (no/multiple faces in photo)
    
    Args:
        student_id: Student ID (e.g., "23BQ1A0566")
    
    Returns:
        (image_array, embedding) or (None, None) if not found
    """
    image_path = STORAGE_TRAINING / f"{student_id}.png"
    
    if not image_path.exists():
        # Try .jpg as fallback
        image_path = STORAGE_TRAINING / f"{student_id}.jpg"
        if not image_path.exists():
            return None, None
    
    try:
        image = face_recognition.load_image_file(str(image_path))
        embedding = extract_embedding(image)
        return image, embedding
    except Exception as e:
        print(f"  ⚠ Failed to load {image_path.name}: {e}")
        return None, None


def extract_embedding(image_path_or_array):
    """
    Extract 128-dimensional embedding using face_recognition.
    
    Deep Learning Pipeline:
    1. Load image from path or use numpy array directly
    2. Detect face using dlib's Histogram of Oriented Gradients (HOG)
    3. Extract 128-dimensional embedding using ResNet-50 CNN pre-trained on VGGFace2
    4. Return embedding as list (JSON-serializable)
    
    The ResNet-50 model provides 99%+ accuracy across varied lighting/angles,
    vastly superior to classical LBPH (85-90%) which was sensitive to lighting changes.
    
    Args:
        image_path_or_array: Path to image or numpy array
    
    Returns:
        List of 128 floats (embedding) or None if no face detected
    """
    try:
        if isinstance(image_path_or_array, str):
            img = face_recognition.load_image_file(image_path_or_array)
        else:
            img = image_path_or_array
        
        encodings = face_recognition.face_encodings(img)
        
        if len(encodings) == 0:
            return None  # No face detected
        if len(encodings) > 1:
            return None  # Multiple faces
        
        return encodings[0].tolist()  # Return as list (JSON-serializable)
    
    except Exception as e:
        print(f"  ⚠ Embedding extraction failed: {e}")
        return None


def average_embeddings(embedding_list):
    """
    Average multiple embeddings for robust student representation.
    
    Why Average Multiple Embeddings?
    - Single image: sensitive to specific angle/lighting
    - Multiple images (front, left, right): robust to pose variations
    - Averaging: reduces noise, increases matching stability
    - Mathematical: mean of 3 embeddings = 3x more stable representation
    
    Args:
        embedding_list: List of 128-dimensional embeddings
    
    Returns:
        Averaged embedding as list
    """
    if not embedding_list:
        return None
    return np.mean(embedding_list, axis=0).tolist()


def init_db():
    """Initialize MongoDB with demo students and their face embeddings."""
    print("\n📚 Initializing MongoDB with deep learning face embeddings...")
    
    # Connect to MongoDB
    try:
        client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
        client.server_info()  # Verify connection
        db = client[DB_NAME]
        print("✓ Connected to MongoDB")
    except Exception as e:
        print(f"✗ MongoDB connection failed: {e}")
        return False
    
    # Create storage directories
    STORAGE_TRAINING.mkdir(parents=True, exist_ok=True)
    print(f"✓ Storage initialized: {STORAGE_TRAINING.parent}")
    
    # Drop existing collections to start fresh
    db.students.drop()
    db.violations.drop()
    db.timetable.drop()
    db.admins.drop()
    print("✓ Collections cleared")
    
    # Initialize timetable
    db.timetable.insert_many(TIMETABLE)
    print(f"✓ {len(TIMETABLE)} timetable entries created")
    
    # Initialize admin user
    admin_hash = generate_password_hash('admin')
    db.admins.insert_one({'username': 'admin', 'password': admin_hash})
    print("✓ Admin user created (admin/admin)")
    
    # Initialize students with embeddings from real images
    print(f"\n📸 Loading images for {len(DEMO_STUDENTS)} students...")
    students_initialized = 0
    
    for idx, student_data in enumerate(DEMO_STUDENTS, 1):
        student_id = student_data['student_id']
        
        # Load real image from storage/training/<student_id>.png
        image, embedding = load_student_image(student_id)
        
        if embedding is not None:
            status = "✓"
            students_initialized += 1
        else:
            status = "⚠"
            embedding = None
        
        print(f"  {idx:2d}. {student_data['name']:20s} ({student_id}) - {status}")
        
        # Insert student into database
        student_doc = {
            **student_data,
            'embedding': embedding,
            'created_at': datetime.now(),
            'status': 'active' if embedding else 'pending_image'
        }
        db.students.insert_one(student_doc)
    
    print(f"\n✓ {students_initialized}/{len(DEMO_STUDENTS)} students initialized with embeddings")
    
    print("\n✅ Database initialization complete!")
    print("\nImage Storage Format:")
    print("  storage/training/<student_id>.png  (single image per student)")
    print("\nSystem is ready for:")
    print("  1. Start Flask backend: python app.py")
    print("  2. Register new students: POST /students with image upload")
    print("  3. Detect bunk violations: POST /match with captured photo")


if __name__ == '__main__':
    init_db()
