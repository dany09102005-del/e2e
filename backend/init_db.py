#!/usr/bin/env python3
"""
Initialize MongoDB with demo data and sample student images
"""
import os
from pathlib import Path
import cv2
import numpy as np
from pymongo import MongoClient
from datetime import datetime

# face_recognition is optional in this environment (requires dlib/CMake).
# Import if available and fall back gracefully.
try:
    import face_recognition
except Exception:
    face_recognition = None

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
DB_NAME = 'attendguard'
STORAGE = Path(__file__).parent / 'storage'

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


def extract_embedding(image):
    """Extract embedding from image"""
    try:
        # Try using face_recognition if available
        if face_recognition is not None:
            encodings = face_recognition.face_encodings(image)
            if encodings:
                return encodings[0].tolist()
    except Exception:
        pass
    
    # Fallback: simple feature extraction
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    small = cv2.resize(gray, (64, 64))
    return small.flatten().astype('float32').tolist()


def init_db():
    """Initialize MongoDB with demo data"""
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Clear existing collections
    db.students.delete_many({})
    db.violations.delete_many({})
    db.timetable.delete_many({})
    db.users.delete_many({})
    
    # Create storage directory
    STORAGE.mkdir(parents=True, exist_ok=True)
    
    print("📚 Initializing demo students...")
    
    # Insert students with generated images
    for i, student_data in enumerate(DEMO_STUDENTS):
        # Generate synthetic face image
        img = generate_sample_face(student_data['name'], student_data['student_id'])
        
        # Save image
        image_filename = f"{student_data['student_id']}_demo.jpg"
        image_path = STORAGE / image_filename
        cv2.imwrite(str(image_path), img)
        
        # Extract embedding
        embedding = extract_embedding(img)
        
        student_doc = {
            'student_id': student_data['student_id'],
            'name': student_data['name'],
            'dept': student_data['dept'],
            'year': student_data['year'],
            'mobile': student_data['mobile'],
            'image': image_filename,
            'embedding': embedding,
            'bunk_count': 0,
            'created_at': datetime.now(),
            'updated_at': datetime.now()
        }
        
        db.students.insert_one(student_doc)
        print(f"  ✓ {student_data['student_id']} - {student_data['name']}")
    
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
