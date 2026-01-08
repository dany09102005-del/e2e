#!/usr/bin/env python3
"""
AttendGuard Backend - Student Attendance Violation Detection
Uses OpenCV, face_recognition, and MongoDB
"""
import os
import json
import datetime
import jwt
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
import cv2
import numpy as np
from pymongo import MongoClient

app = Flask(__name__)
CORS(app)

# Load environment variables from backend/.env if present
load_dotenv((Path(__file__).parent / '.env'))

# Configuration
ROOT = Path(__file__).parent
STORAGE = ROOT / 'storage'
DESIGN_DIR = ROOT.parent / 'ui_[pics'
ALLOWED = {'png', 'jpg', 'jpeg'}
SECRET = os.environ.get('APP_SECRET', 'dev-secret-key-change-in-prod')

# MongoDB Connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
DB_NAME = 'attendguard'

try:
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    print("✓ Connected to MongoDB")
except Exception as e:
    print(f"✗ MongoDB connection error: {e}")
    db = None


def get_db():
    """Get database connection"""
    global db
    if db is None:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
    return db


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED


def image_to_embedding(image_path):
    """Extract face embedding from image using face_recognition"""
    try:
        import face_recognition
        image = face_recognition.load_image_file(str(image_path))
        encodings = face_recognition.face_encodings(image)
        if encodings:
            return encodings[0].tolist()
        return None
    except Exception:
        # Fallback: OpenCV based simple feature extraction
        try:
            img = cv2.imread(str(image_path))
            if img is None:
                return None
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            small = cv2.resize(gray, (64, 64))
            return small.flatten().astype('float32').tolist()
        except Exception:
            return None


def compare_embeddings(emb1, emb2):
    """Compare two embeddings and return similarity score (0-1)"""
    if not emb1 or not emb2:
        return 0.0
    
    try:
        import face_recognition
        # Use face_recognition distance if available
        dist = face_recognition.face_distance([emb1], emb2)[0]
        return float(1.0 - dist)
    except Exception:
        # Fallback: cosine similarity
        a, b = np.array(emb1), np.array(emb2)
        if a.shape != b.shape:
            return 0.0
        return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-5))


# === AUTH ROUTES ===

@app.route('/auth/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')
    role = data.get('role', 'Security')
    
    if not username or not password:
        return jsonify({'error': 'username and password required'}), 400
    
    db = get_db()
    users = db.users
    
    if users.find_one({'username': username}):
        return jsonify({'error': 'user exists'}), 400
    
    users.insert_one({
        'username': username,
        'password_hash': generate_password_hash(password),
        'role': role,
        'created_at': datetime.datetime.now()
    })
    
    return jsonify({'status': 'created'})


@app.route('/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')
    
    db = get_db()
    user = db.users.find_one({'username': username})
    
    if user and check_password_hash(user.get('password_hash', ''), password):
        payload = {'username': username, 'role': user.get('role')}
        token = jwt.encode(payload, SECRET, algorithm='HS256')
        return jsonify({'token': token})
    
    return jsonify({'error': 'invalid credentials'}), 401


def token_required(f):
    def wrap(*args, **kwargs):
        auth = request.headers.get('Authorization', '')
        if not auth.startswith('Bearer '):
            return jsonify({'error': 'Authorization required'}), 401
        token = auth.split(' ', 1)[1]
        try:
            payload = jwt.decode(token, SECRET, algorithms=['HS256'])
            request.user = payload
        except Exception:
            return jsonify({'error': 'Invalid token'}), 401
        return f(*args, **kwargs)
    wrap.__name__ = f.__name__
    return wrap


# === STUDENT ROUTES ===
@app.route('/students', methods=['GET'])
def get_students():
    db = get_db()
    students = list(db.students.find({}, {'embedding': 0}))
    for s in students:
        s['_id'] = str(s['_id'])
    return jsonify(students)


@app.route('/students/<student_id>', methods=['GET'])
def get_student(student_id):
    db = get_db()
    student = db.students.find_one({'student_id': student_id}, {'embedding': 0})
    if student:
        student['_id'] = str(student['_id'])
        return jsonify(student)
    return jsonify({'error': 'not found'}), 404


@app.route('/students', methods=['POST'])
@token_required
def add_student():
    db = get_db()
    data = request.form.to_dict()
    file = request.files.get('image')
    
    if not data.get('student_id'):
        return jsonify({'error': 'student_id required'}), 400
    
    STORAGE.mkdir(parents=True, exist_ok=True)
    
    filename = None
    embedding = None
    
    if file and allowed_file(file.filename):
        filename = secure_filename(f"{data.get('student_id')}_{file.filename}")
        path = STORAGE / filename
        file.save(path)
        embedding = image_to_embedding(path)
    
    student_doc = {
        'student_id': data.get('student_id'),
        'name': data.get('name', 'Unknown'),
        'dept': data.get('dept', 'CSE'),
        'year': data.get('year', '1'),
        'mobile': data.get('mobile', ''),
        'image': filename,
        'embedding': embedding,
        'bunk_count': 0,
        'created_at': datetime.datetime.now(),
        'updated_at': datetime.datetime.now()
    }
    
    result = db.students.insert_one(student_doc)
    student_doc['_id'] = str(result.inserted_id)
    
    return jsonify({'status': 'created', 'student': student_doc}), 201


# === MATCHING & DETECTION ===
@app.route('/match', methods=['POST'])
def match_student():
    file = request.files.get('image')
    if not file or not allowed_file(file.filename):
        return jsonify({'error': 'Image required (png/jpg/jpeg)'}), 400
    
    location = request.form.get('location', 'Unknown')
    
    STORAGE.mkdir(parents=True, exist_ok=True)
    filename = secure_filename(f"capture_{datetime.datetime.now().timestamp()}_{file.filename}")
    path = STORAGE / filename
    file.save(path)
    
    # Extract embedding from captured image
    captured_emb = image_to_embedding(path)
    if not captured_emb:
        return jsonify({'match': None, 'confidence': 0.0, 'error': 'No face detected'}), 200
    
    # Search in MongoDB
    db = get_db()
    students = list(db.students.find({'embedding': {'$ne': None}}))
    
    best_match = None
    best_score = 0.0
    
    for student in students:
        if not student.get('embedding'):
            continue
        score = compare_embeddings(captured_emb, student['embedding'])
        if score > best_score:
            best_score = score
            best_match = student
    
    threshold = 0.5
    if best_match and best_score >= threshold:
        # Update bunk count
        db.students.update_one(
            {'_id': best_match['_id']},
            {'$inc': {'bunk_count': 1}, '$set': {'updated_at': datetime.datetime.now()}}
        )
        
        # Record violation
        violation = {
            'student_id': best_match['student_id'],
            'student_name': best_match['name'],
            'dept': best_match['dept'],
            'location': location,
            'timestamp': datetime.datetime.now(),
            'confidence': float(best_score),
            'image': filename
        }
        db.violations.insert_one(violation)
        
        best_match['_id'] = str(best_match['_id'])
        return jsonify({'match': best_match, 'confidence': best_score})
    
    return jsonify({'match': None, 'confidence': best_score})


# === VIOLATIONS & REPORTS ===
@app.route('/violations', methods=['GET'])
def get_violations():
    db = get_db()
    violations = list(db.violations.find().sort('timestamp', -1))
    for v in violations:
        v['_id'] = str(v['_id'])
        v['timestamp'] = v['timestamp'].isoformat()
    return jsonify(violations)


@app.route('/timetable', methods=['GET'])
def get_timetable():
    db = get_db()
    timetable = list(db.timetable.find())
    for t in timetable:
        t['_id'] = str(t['_id'])
    return jsonify(timetable)


# === FILE SERVING ===
@app.route('/storage/<path:filename>')
def serve_storage(filename):
    return send_from_directory(STORAGE, filename)


@app.route('/design/<path:filename>')
def serve_design(filename):
    if DESIGN_DIR.exists():
        return send_from_directory(DESIGN_DIR, filename)
    return jsonify({'error': 'design assets not found'}), 404


@app.route('/ping')
def ping():
    return jsonify({'status': 'ok'})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
