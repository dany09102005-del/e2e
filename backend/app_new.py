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
import json

app = Flask(__name__)
CORS(app)

# Load environment variables from backend/.env if present
load_dotenv((Path(__file__).parent / '.env'))

# Configuration
ROOT = Path(__file__).parent
# Separate storage folders to keep training and test data distinct
# See: https://en.wikipedia.org/wiki/Training,_validation,_and_test_sets
# storage/training  -> registered student face images (used to train LBPH model)
# storage/uploads   -> images captured during bunk checking (used for matching)
STORAGE_TRAINING = ROOT / 'storage' / 'training'
STORAGE_UPLOADS = ROOT / 'storage' / 'uploads'
MODEL_PATH = ROOT / 'model.yml'
LABELS_PATH = ROOT / 'labels.json'
HAAR_CASCADE_PATH = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
DESIGN_DIR = ROOT.parent / 'ui_[pics'
ALLOWED = {'png', 'jpg', 'jpeg'}
SECRET = os.environ.get('APP_SECRET', 'dev-secret-key-change-in-prod')

# Ensure both storage folders exist on startup
def init_storage():
    """Create storage folders if they do not exist."""
    try:
        STORAGE_TRAINING.mkdir(parents=True, exist_ok=True)
        STORAGE_UPLOADS.mkdir(parents=True, exist_ok=True)
        print(f"✓ Storage initialized: {STORAGE_TRAINING.parent}")
    except Exception as e:
        print(f"✗ Failed to initialize storage: {e}")

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

# Initialize storage folders
init_storage()


def get_db():
    """Get database connection"""
    global db
    if db is None:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
    return db


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED


def image_bytes_to_embedding(image_bytes):
    """Convert raw image bytes to a simple OpenCV-based embedding.

    Steps (robust, no external models):
    - Decode bytes with `cv2.imdecode` (safe)
    - Convert to grayscale
    - Resize to 64x64
    - Flatten and normalize to unit vector (float32)
    Returns list[float] or None on failure.
    """
    try:
        if not image_bytes:
            return None
        arr = np.frombuffer(image_bytes, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            return None
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        small = cv2.resize(gray, (64, 64))
        emb = small.astype('float32').flatten()
        norm = np.linalg.norm(emb)
        if norm > 1e-8:
            emb = emb / norm
        return emb.tolist()
    except Exception:
        return None


def image_to_embedding(image_source):
    """Wrapper: accept bytes or a filesystem path and return embedding using OpenCV-only pipeline."""
    try:
        # If bytes-like
        if isinstance(image_source, (bytes, bytearray)):
            return image_bytes_to_embedding(image_source)
        # Otherwise treat as path-like
        with open(str(image_source), 'rb') as fh:
            return image_bytes_to_embedding(fh.read())
    except Exception:
        return None


def compare_embeddings(emb1, emb2):
    """Compare two embeddings using cosine similarity. Returns float in [-1,1].

    If shapes mismatch or values invalid, returns 0.0.
    """
    try:
        if emb1 is None or emb2 is None:
            return 0.0
        a = np.array(emb1, dtype='float32')
        b = np.array(emb2, dtype='float32')
        if a.size == 0 or b.size == 0 or a.shape != b.shape:
            return 0.0
        denom = (np.linalg.norm(a) * np.linalg.norm(b) + 1e-8)
        return float(np.dot(a, b) / denom)
    except Exception:
        return 0.0


# --- LBPH face recognizer utilities (OpenCV-only) ---
def get_haar_detector():
    """Return a Haar Cascade classifier for face detection. Safe to call repeatedly."""
    try:
        return cv2.CascadeClassifier(HAAR_CASCADE_PATH)
    except Exception:
        return None


def load_lbph_recognizer():
    """Load LBPH recognizer and labels mapping if present. Returns (recognizer, labels_map) or (None, {})."""
    try:
        # LBPH is in cv2.face (opencv-contrib). Guard against missing contrib.
        recognizer = None
        if hasattr(cv2, 'face') and hasattr(cv2.face, 'LBPHFaceRecognizer_create'):
            recognizer = cv2.face.LBPHFaceRecognizer_create()
        else:
            # Try older API lookup
            recognizer = getattr(cv2, 'LBPHFaceRecognizer_create', None)
            if recognizer:
                recognizer = recognizer()
        if recognizer is None:
            print('LBPH recognizer not available in this OpenCV build (requires opencv-contrib-python).')
            return None, {}

        if MODEL_PATH.exists():
            recognizer.read(str(MODEL_PATH))
        labels_map = {}
        if LABELS_PATH.exists():
            try:
                with open(LABELS_PATH, 'r') as fh:
                    labels_map = json.load(fh)
            except Exception:
                labels_map = {}
        return recognizer, labels_map
    except Exception as e:
        print('Error loading LBPH recognizer:', e)
        return None, {}


# lazy-loaded recognizer and labels
_LBPH = None
_LABELS = {}

def ensure_recognizer():
    global _LBPH, _LABELS
    if _LBPH is None:
        _LBPH, _LABELS = load_lbph_recognizer()
    return _LBPH is not None



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
    """Register a new student with a face image for training.
    
    Image is saved to storage/training/ folder.
    This training data is later used to train the LBPH recognizer.
    """
    db = get_db()
    data = request.form.to_dict()
    file = request.files.get('image')
    
    if not data.get('student_id'):
        return jsonify({'error': 'student_id required'}), 400
    
    filename = None
    embedding = None
    
    if file and allowed_file(file.filename):
        # Save to training folder for LBPH model training
        filename = secure_filename(f"{data.get('student_id')}_{file.filename}")
        path = STORAGE_TRAINING / filename
        # Read bytes safely, compute embedding with OpenCV, then save
        file_bytes = file.read()
        embedding = image_to_embedding(file_bytes)
        try:
            with open(path, 'wb') as ofh:
                ofh.write(file_bytes)
        except Exception:
            # If save fails, continue without file but keep embedding if available
            print(f"Warning: failed to save student image to {path}")
    
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
    """Match captured image against trained LBPH model.
    
    Image is saved to storage/uploads/ folder.
    This test data is used only for matching and reporting, never for training.
    Keeping training and test data separate ensures model accuracy and prevents overfitting.
    """
    # Match using OpenCV LBPH recognizer with Haar face detection.
    # Always return JSON and never crash.
    try:
        file = request.files.get('image')
        if not file or not allowed_file(file.filename):
            return jsonify({'success': False, 'error': 'Image required (png/jpg/jpeg)'}), 400

        location = request.form.get('location', 'Unknown')

        file_bytes = file.read()
        filename = secure_filename(f"capture_{datetime.datetime.now().timestamp()}_{file.filename}")
        # Save to uploads folder for audit trail and reporting
        path = STORAGE_UPLOADS / filename
        try:
            with open(path, 'wb') as ofh:
                ofh.write(file_bytes)
        except Exception:
            print(f"Warning: failed to save capture to {path}")

        # Decode image bytes safely
        arr = np.frombuffer(file_bytes, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            return jsonify({'success': True, 'match': None, 'confidence': None, 'error': 'Could not decode image.'}), 200

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # Detect faces using Haar Cascade
        detector = get_haar_detector()
        if detector is None:
            return jsonify({'success': False, 'error': 'Haar Cascade not available on server.'}), 500

        faces = detector.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)
        if len(faces) == 0:
            return jsonify({'success': True, 'match': None, 'confidence': None, 'error': 'No face detected.'}), 200

        # Ensure recognizer is loaded
        if not ensure_recognizer():
            return jsonify({'success': False, 'error': 'LBPH recognizer not available or not trained.'}), 500

        # For LBPH, lower confidence means better match. We'll pick smallest confidence.
        best = None
        best_conf = float('inf')
        best_label = None

        for (x, y, w, h) in faces:
            face = gray[y:y+h, x:x+w]
            try:
                face_resized = cv2.resize(face, (200, 200))
            except Exception:
                continue

            try:
                label, conf = _LBPH.predict(face_resized)
            except Exception as e:
                # If prediction fails, skip this face
                print('LBPH predict error:', e)
                continue

            # track best (smallest) confidence
            if conf < best_conf:
                best_conf = float(conf)
                best_label = str(label)
                best = {'label': label, 'confidence': float(conf), 'rect': [int(x), int(y), int(w), int(h)]}

        # No successful prediction
        if best is None or best_label is None:
            return jsonify({'success': True, 'match': None, 'confidence': None, 'error': 'No recognizer prediction.'}), 200

        # Convert LBPH distance (lower is better) into a similarity score [0..1]
        # so the frontend can treat higher = better. We clamp to [0,1].
        LBPH_MAX = float(os.environ.get('LBPH_MAX', '200.0'))
        similarity = max(0.0, min(1.0, 1.0 - (best_conf / LBPH_MAX)))

        # Map label to student_id using labels file
        student_id = _LABELS.get(best_label)
        if not student_id:
            return jsonify({'success': True, 'match': None, 'confidence': similarity, 'error': 'Unknown label.'}), 200

        # Lookup student in DB
        db = get_db()
        student = db.students.find_one({'student_id': student_id})
        if not student:
            return jsonify({'success': True, 'match': None, 'confidence': similarity, 'error': 'Student not found in DB.'}), 200

        # Decide match threshold: LBPH lower is better. Use 0.45 for strict matching.
        LBPH_THRESHOLD = float(os.environ.get('LBPH_THRESHOLD', '50.0'))
        is_match = best_conf < LBPH_THRESHOLD

        if is_match:
            try:
                db.students.update_one({'_id': student['_id']}, {'$inc': {'bunk_count': 1}, '$set': {'updated_at': datetime.datetime.now()}})
            except Exception:
                pass
            violation = {
                'student_id': student.get('student_id'),
                'student_name': student.get('name'),
                'dept': student.get('dept'),
                'location': location,
                'timestamp': datetime.datetime.now(),
                'confidence': similarity,
                'image': filename
            }
            try:
                db.violations.insert_one(violation)
            except Exception:
                print('Warning: failed to insert violation record')

            student['_id'] = str(student['_id'])
            return jsonify({'success': True, 'matched': True, 'student': student, 'match': student, 'confidence': similarity})

        # Not a confident match
        return jsonify({'success': True, 'matched': False, 'student': None, 'match': None, 'confidence': similarity})

    except Exception as e:
        print(f"Match error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': 'Server error during matching', 'detail': str(e)}), 500


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
    # Serve files from storage/training or storage/uploads depending on where the file exists.
    # This preserves backward compatibility with earlier flat `storage/` URLs.
    try:
        train_path = STORAGE_TRAINING / filename
        upload_path = STORAGE_UPLOADS / filename
        if train_path.exists():
            return send_from_directory(STORAGE_TRAINING, filename)
        if upload_path.exists():
            return send_from_directory(STORAGE_UPLOADS, filename)
        return jsonify({'error': 'file not found'}), 404
    except Exception as e:
        print(f"serve_storage error: {e}")
        return jsonify({'error': 'internal server error'}), 500


@app.route('/design/<path:filename>')
def serve_design(filename):
    if DESIGN_DIR.exists():
        return send_from_directory(DESIGN_DIR, filename)
    return jsonify({'error': 'design assets not found'}), 404


@app.route('/ping')
def ping():
    return jsonify({'status': 'ok'})

# STUDENTS ADDED THROUGH FRONTEND
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
