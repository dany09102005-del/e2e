#!/usr/bin/env python3
"""
Initialize MongoDB with demo data and student embeddings using face_recognition.

DEEP LEARNING EMBEDDINGS:
- Uses dlib's ResNet-based CNN for face encoding
- Each student gets 3 synthetic face images (front, left, right angles)
- Encodings from all 3 images are extracted and averaged
- Averaged embedding is stored for matching during bunk checking
"""
import os
import sys
import io
from pathlib import Path
import cv2
import numpy as np
from pymongo import MongoClient
from datetime import datetime

# Import face_recognition with stderr suppression to avoid warnings
face_recognition = None
try:
    # Suppress the "Please install face_recognition_models" warning
    old_stderr = sys.stderr
    sys.stderr = io.StringIO()
    try:
        import face_recognition
    finally:
        sys.stderr = old_stderr
except ImportError:
    print("⚠️  face_recognition library not available. Install: pip install face-recognition")
    sys.exit(1)

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
DB_NAME = 'attendguard'
# Demo student images are saved to training folder (will be used to compute embeddings)
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
    {'student_id': '23BQ1A0575', 'name': 'Isha Kapoor', 'dept': 'Information Technology', 'year': '2', 'mobile': '9876543223'},
    {'student_id': '23BQ1A0576', 'name': 'Manish Yadav', 'dept': 'Civil', 'year': '3', 'mobile': '9876543224'},
]

TIMETABLE = [
    {'class_code': 'CS101', 'subject': 'Data Structures', 'day': 'Monday', 'start': '09:00', 'end': '10:00', 'faculty': 'Dr. Kumar Singh', 'room': 'Room 301'},
    {'class_code': 'CS101', 'subject': 'Data Structures', 'day': 'Wednesday', 'start': '09:00', 'end': '10:00', 'faculty': 'Dr. Kumar Singh', 'room': 'Room 301'},
    {'class_code': 'EC201', 'subject': 'Digital Electronics', 'day': 'Tuesday', 'start': '10:00', 'end': '11:00', 'faculty': 'Dr. Suresh Kumar', 'room': 'Lab 3'},
    {'class_code': 'ME101', 'subject': 'Mechanics', 'day': 'Monday', 'start': '11:00', 'end': '12:00', 'faculty': 'Dr. Prakash Reddy', 'room': 'Room 401'},
    {'class_code': 'CV101', 'subject': 'Engineering Design', 'day': 'Friday', 'start': '09:00', 'end': '10:00', 'faculty': 'Prof. Arjun', 'room': 'Room 201'},
]


def generate_sample_face(name_str, student_id):
    """Generate a synthetic face image for demo purposes"""
    img = np.ones((224, 224, 3), dtype=np.uint8) * 240
    
    # Add colored background
    color = hash(student_id) % 256
    img[:, :] = [200 + (color % 50), 220 + (color % 20), 240]
    
    # Add simple geometric face outline
    cv2.circle(img, (112, 90), 40, (100, 100, 100), -1)  # Head
    cv2.circle(img, (95, 80), 8, (0, 0, 0), -1)  # Left eye
    cv2.circle(img, (130, 80), 8, (0, 0, 0), -1)  # Right eye
    cv2.ellipse(img, (112, 110), (15, 10), 0, 0, 180, (100, 100, 100), 2)  # Mouth
    
    # Add name text
    cv2.putText(img, name_str[:15], (20, 180), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (50, 50, 50), 2)
    cv2.putText(img, student_id, (20, 210), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (80, 80, 80), 1)
    
    return img


def extract_embedding(image_path_or_array):
    """Extract face encoding using deep learning (face_recognition).
    
    DEEP LEARNING: Uses dlib ResNet model trained on millions of faces.
    Returns 128-dimensional embedding vector or None if no face detected.
    
    Args:
        image_path_or_array: file path (str/Path) or numpy array
    
    Returns:
        list[float] (128 values) or None
    """
    try:
        # Use deep learning face_recognition
        if isinstance(image_path_or_array, (str, Path)):
            image = face_recognition.load_image_file(str(image_path_or_array))
        else:
            # Assume it's a numpy array already
            image = image_path_or_array
        
        encodings = face_recognition.face_encodings(image)
        
        if len(encodings) > 0:
            return encodings[0].tolist()
        
        return None
    except Exception as e:
        print(f"Error extracting embedding: {e}")
        return None


def average_embeddings(embedding_list):
    """Average multiple embeddings for a stable student embedding.
    
    Multiple images of same student -> averaged embedding is more robust
    to variation in pose, lighting, and expression.
    
    Args:
        embedding_list: list of embeddings (each is list[float])
    
    Returns:
        list[float]: averaged embedding
    """
    if not embedding_list:
        return None
    
    arr = np.array(embedding_list, dtype='float32')
    avg = np.mean(arr, axis=0)
    return avg.tolist()



def init_db():
    """Initialize MongoDB with demo data"""
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Clear existing collections
    db.students.delete_many({})
    db.violations.delete_many({})
    db.timetable.delete_many({})
    db.users.delete_many({})
    
    # Create storage/training directory for demo student images
    # These images will be used to compute deep learning embeddings
    STORAGE_TRAINING.mkdir(parents=True, exist_ok=True)
    
    print("📚 Initializing demo students with deep learning embeddings...")
    
    # Insert students with generated images in per-student subdirectories
    for i, student_data in enumerate(DEMO_STUDENTS):
        student_id = student_data['student_id']
        
        # Create per-student subdirectory: storage/training/<student_id>/
        student_dir = STORAGE_TRAINING / student_id
        student_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate and save 3 demo images per student (different angles/expressions)
        # Multiple images improve embedding robustness
        image_names = []
        all_embeddings = []  # Collect embeddings from ALL images for averaging
        
        for angle_idx, angle_name in enumerate(['front', 'left', 'right']):
            # Generate synthetic face image with slight variation per angle
            img = generate_sample_face(student_data['name'], student_id)
            
            # Add slight variation (rotation, brightness) to simulate different angles
            M = cv2.getRotationMatrix2D((112, 112), angle_idx * 15 - 15, 1.0)
            img = cv2.warpAffine(img, M, (224, 224), borderValue=(240, 240, 240))
            
            # Save image with semantic name: front.jpg, left.jpg, right.jpg
            image_filename = f"{angle_name}.jpg"
            image_path = student_dir / image_filename
            cv2.imwrite(str(image_path), img)
            
            # Extract embedding from this image using deep learning
            embedding = extract_embedding(img)
            if embedding is not None:
                all_embeddings.append(embedding)
            
            image_names.append(image_filename)
        
        # Average embeddings from all valid images for stable student embedding
        student_embedding = average_embeddings(all_embeddings) if all_embeddings else None
        
        student_doc = {
            'student_id': student_id,
            'name': student_data['name'],
            'dept': student_data['dept'],
            'year': student_data['year'],
            'mobile': student_data['mobile'],
            'image_dir': str(student_dir),  # reference to subdirectory
            'images': image_names,  # list of saved images
            'image': image_names[0] if image_names else None,  # first image for backward compat
            'embedding': student_embedding,  # averaged deep learning embedding (128 dims)
            'num_training_images': len(image_names),
            'num_valid_faces': len(all_embeddings),
            'embedding_method': 'deep_learning_averaged',
            'bunk_count': 0,
            'created_at': datetime.now(),
            'updated_at': datetime.now()
        }
        
        db.students.insert_one(student_doc)
        print(f"  ✓ {student_id} - {student_data['name']} ({len(all_embeddings)} embeddings averaged)")
    
    print("\n📅 Initializing timetable...")
    for t in TIMETABLE:
        db.timetable.insert_one(t)
    print(f"  ✓ {len(TIMETABLE)} classes scheduled")
    
    print("\n👤 Initializing admin user...")
    from werkzeug.security import generate_password_hash
    db.users.insert_one({
        'username': 'admin',
        'password_hash': generate_password_hash('admin'),
        'role': 'Admin',
        'created_at': datetime.now()
    })
    print("  ✓ admin / admin")
    
    print("\n✅ Database initialization complete!")
    print(f"   Students: {db.students.count_documents({})}")
    print(f"   Timetable: {db.timetable.count_documents({})}")
    print(f"   Users: {db.users.count_documents({})}")


if __name__ == '__main__':
    init_db()
