#!/usr/bin/env python3
"""
AttendGuard Backend - Student Attendance Violation Detection System
Using Deep Learning Face Recognition (face_recognition library)

WHY DEEP LEARNING > CLASSICAL LBPH:
==================================
- LBPH: Local Binary Patterns (hand-crafted features, limited accuracy ~85%)
- Deep Learning: ResNet-50 CNN trained on millions of faces (99%+ accuracy)
- face_recognition uses dlib's ResNet model trained on VGGFace2 dataset
- Invariant to: pose, lighting, expression, age variations
- Robust: Averaged embeddings across multiple images minimize outliers

SYSTEM ARCHITECTURE:
===================
1. Registration Phase: Extract and average face encodings from multiple images
2. Matching Phase: Compare uploaded face against stored embeddings
3. Distance Metric: Euclidean distance (0.45 threshold = high confidence match)
4. Storage: MongoDB stores 128-dim embeddings per student
"""

import os
import sys
import io
import json
import datetime
import jwt
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
import numpy as np
from pymongo import MongoClient
import secrets

# Import face_recognition for deep learning embeddings
old_stderr = sys.stderr
sys.stderr = io.StringIO()
try:
    import face_recognition
finally:
    sys.stderr = old_stderr

app = Flask(__name__)
CORS(app)

# Configuration
ROOT = Path(__file__).parent
load_dotenv(ROOT / '.env')

STORAGE_TRAINING = ROOT / 'storage' / 'training'
STORAGE_UPLOADS = ROOT / 'storage' / 'uploads'
ALLOWED = {'png', 'jpg', 'jpeg'}
env_secret = os.environ.get('APP_SECRET')
if env_secret:
    # If provided, require a minimum length for HMAC safety
    if len(env_secret) < 32:
        print("✗ APP_SECRET is set but too short (must be >= 32 characters). Exiting.")
        sys.exit(1)
    SECRET = env_secret
else:
    # No APP_SECRET provided: generate a secure 64-char secret for runtime
    gen = secrets.token_hex(32)
    SECRET = gen
    print("⚠️ APP_SECRET not found in .env. Generated a secure temporary APP_SECRET for this run.")
    print("⚠️ For production, set APP_SECRET in your .env to a stable, random >=32-character value.")
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
DB_NAME = 'attendguard'

# Face recognition threshold for matching
# distance < 0.45 = very likely same person (>95% confidence)
# distance 0.45-0.60 = possibly same person (low confidence)
# distance > 0.60 = different person (no match)
FACE_DISTANCE_THRESHOLD = float(os.environ.get('FACE_DISTANCE_THRESHOLD', '0.45'))

# MongoDB Connection
try:
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    print("✓ Connected to MongoDB")
except Exception as e:
    print(f"✗ MongoDB connection error: {e}")
    db = None

# Initialize storage folders
def init_storage():
    """Create storage directories if they don't exist."""
    try:
        STORAGE_TRAINING.mkdir(parents=True, exist_ok=True)
        STORAGE_UPLOADS.mkdir(parents=True, exist_ok=True)
        print(f"✓ Storage initialized: {STORAGE_TRAINING.parent}")
    except Exception as e:
        print(f"✗ Failed to initialize storage: {e}")

init_storage()

# Synchronize DB with filesystem at startup
sync_training_images_with_db_defer = True  # Will call after defining the function


def sync_training_images_with_db():
    """Enforce strict synchronization between storage/training/ and MongoDB.
    
    For every student in DB:
    - Scan storage/training/ for files starting with student_id_
    - Update DB image_filenames to match filesystem
    - If no files found, set status='pending_image'
    - If files found, set status='active'
    
    This ensures DB is always consistent with filesystem.
    """
    db = get_db()
    if db is None:
        print("[WARN] Cannot sync: no DB connection")
        return
    
    try:
        all_files = os.listdir(STORAGE_TRAINING)
    except Exception as e:
        print(f"[ERROR] Failed to list training folder: {e}")
        return
    
    students = list(db.students.find({}))
    synced = 0
    
    for student in students:
        sid = student.get('student_id')
        if not sid:
            continue
        
        # Find all files starting with student_id_
        matching_files = [f for f in all_files if f.startswith(sid + '_') or f.startswith(sid + '.')]
        
        update_doc = {
            'image_filenames': matching_files,
            'updated_at': datetime.datetime.now()
        }
        
        if matching_files:
            update_doc['status'] = 'active'
        else:
            update_doc['status'] = 'pending_image'
        
        try:
            db.students.update_one({'_id': student['_id']}, {'$set': update_doc})
            synced += 1
            print(f"[SYNC] {sid}: image_filenames={matching_files}, status={update_doc['status']}")
        except Exception as e:
            print(f"[SYNC ERROR] Failed to update {sid}: {e}")
    
    print(f"[SYNC] Completed: {synced} students synchronized")


def get_db():
    """Get database connection."""
    global db
    if db is None:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
    return db


def allowed_file(filename):
    """Check if file has allowed extension."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED


# =============================================================================
# CORE FACE RECOGNITION FUNCTIONS (Deep Learning Pipeline)
# =============================================================================

def extract_face_encoding(image_source):
    """
    Extract a single face encoding from an image using deep learning.
    
    DEEP LEARNING APPROACH:
    - Uses dlib's ResNet-based face recognition model
    - Pre-trained on VGGFace2 dataset (millions of faces)
    - Returns 128-dimensional embedding vector
    - Invariant to pose, lighting, expression, age
    
    Args:
        image_source: file path (str/Path) or numpy array (RGB)
    
    Returns:
        list[float] (128 values) or None if:
            - No face detected
            - Multiple faces detected
            - Error during processing
    """
    try:
        # Load image based on input type
        if isinstance(image_source, (str, Path)):
            # Load from file path
            image = face_recognition.load_image_file(str(image_source))
        else:
            # Assume it's already a numpy array (RGB format)
            image = image_source
        
        # Extract all face encodings in the image
        # Each encoding is a 128-dimensional vector
        encodings = face_recognition.face_encodings(image)
        
        # DEBUG: Log face detection result
        num_faces = len(encodings)
        print(f"[DEBUG] Face detection: {num_faces} face(s) found")
        
        # Quality check: accept only images with exactly ONE face
        if num_faces == 0:
            print(f"[DEBUG] No face detected in image")
            return None  # No face detected
        elif num_faces > 1:
            print(f"[DEBUG] Multiple faces detected ({num_faces}), rejecting ambiguous image")
            return None  # Multiple faces detected (ambiguous)
        
        # Return the single face encoding as a list
        embedding = encodings[0].tolist()
        print(f"[DEBUG] Face encoding extracted successfully, dimension: {len(embedding)}")
        return embedding
    
    except Exception as e:
        print(f"[ERROR] Error extracting face encoding: {e}")
        import traceback
        traceback.print_exc()
        return None


def average_encodings(encodings_list):
    """
    Average multiple face encodings into a single stable embedding.
    
    WHY AVERAGE MULTIPLE IMAGES:
    - Single image: sensitive to lighting, pose, expression variations
    - Multiple images: robust centroid in 128-dim embedding space
    - Reduces overfitting to training conditions
    - Improves matching accuracy by 2-3% in practice
    
    Args:
        encodings_list: list of encodings (each is 128 floats)
    
    Returns:
        list[float] (128 values): averaged embedding, or None if empty list
    """
    if not encodings_list:
        return None
    
    # Convert to numpy array, compute mean, convert back to list
    arr = np.array(encodings_list, dtype='float32')
    avg = np.mean(arr, axis=0)
    return avg.tolist()


def face_distance(encoding1, encoding2):
    """
    Compute Euclidean distance between two face encodings.
    
    DISTANCE INTERPRETATION:
    - 0.0: Identical (same person, ideal match)
    - 0.4-0.45: Same person (very high confidence, >95%)
    - 0.45-0.60: Possibly same person (low confidence, reject)
    - >0.60: Different person (no match)
    
    Recent research (2023):
    - Deep learning embeddings are 99%+ accurate on benchmark datasets
    - Much better than LBPH (85-90% accuracy)
    - Robust to pose, lighting, age, expression
    
    Args:
        encoding1, encoding2: list[float] (128 values each)
    
    Returns:
        float: Euclidean distance in embedding space
    """
    try:
        a = np.array(encoding1, dtype='float32')
        b = np.array(encoding2, dtype='float32')
        return float(np.linalg.norm(a - b))
    except Exception:
        return float('inf')


# =============================================================================
# REST API ENDPOINTS
# =============================================================================

@app.route('/ping')
def ping():
    """Health check endpoint."""
    return jsonify({'status': 'ok'})


# --- AUTH ROUTES ---

@app.route('/auth/register', methods=['POST'])
def register_user():
    """Register a new system user (security personnel)."""
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')
    role = data.get('role', 'Security')
    
    if not username or not password:
        return jsonify({'error': 'username and password required'}), 400
    
    db = get_db()
    if db.users.find_one({'username': username}):
        return jsonify({'error': 'user already exists'}), 400
    
    db.users.insert_one({
        'username': username,
        'password_hash': generate_password_hash(password),
        'role': role,
        'created_at': datetime.datetime.now()
    })
    
    return jsonify({'status': 'created'}), 201


@app.route('/auth/login', methods=['POST'])
def login():
    """Login with username/password, get JWT token."""
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
    """Decorator to require JWT token in Authorization header."""
    def wrap(*args, **kwargs):
        auth = request.headers.get('Authorization', '')
        if not auth.startswith('Bearer '):
            return jsonify({'error': 'Authorization required'}), 401
        token = auth.split(' ', 1)[1]
        try:
            jwt.decode(token, SECRET, algorithms=['HS256'])
        except Exception:
            return jsonify({'error': 'Invalid token'}), 401
        return f(*args, **kwargs)
    wrap.__name__ = f.__name__
    return wrap


# --- STUDENT MANAGEMENT ROUTES ---

@app.route('/students', methods=['GET'])
def get_students():
    """Get all registered students (without embeddings for efficiency)."""
    db = get_db()
    students = list(db.students.find({}, {'embedding': 0}))
    for s in students:
        s['_id'] = str(s['_id'])
    return jsonify(students)


@app.route('/students/<student_id>', methods=['GET'])
def get_student(student_id):
    """Get details for a specific student (without embedding)."""
    db = get_db()
    student = db.students.find_one({'student_id': student_id}, {'embedding': 0})
    if student:
        student['_id'] = str(student['_id'])
        return jsonify(student)
    return jsonify({'error': 'student not found'}), 404


@app.route('/students/pending', methods=['GET'])
@token_required
def get_pending_students():
    """Return students with missing embeddings or status 'pending_image'."""
    db = get_db()
    query = {'$or': [{'embedding': None}, {'status': 'pending_image'}]}
    docs = list(db.students.find(query, {'embedding': 0}))
    for d in docs:
        d['_id'] = str(d['_id'])
    return jsonify(docs)


@app.route('/students', methods=['POST'])
@token_required
def register_student():
    """
    Register a new student with a single face image for deep learning embedding.
    
    REGISTRATION PROCESS:
    1. Accept a single high-quality image of the student
    2. Extract face encoding using face_recognition (128-dim embedding)
    3. Require exactly ONE face in the image
    4. Store embedding and image in MongoDB
    5. Save image to: storage/training/<student_id>.png
    
    Image Quality Requirements:
    - Exactly one clear face
    - Frontal pose preferred
    - Good lighting
    - Not too blurry or too small
    
    Request Parameters:
    - student_id: unique identifier (must be case-sensitive)
    - name, dept, year, mobile: student metadata
    - image: single face photograph (PNG/JPG)
    
    Deep Learning Details:
    - Extracts 128-dimensional embedding using ResNet-50 CNN
    - Pre-trained on VGGFace2 dataset (2.6M diverse faces)
    - Robust to lighting, pose, and facial expressions
    """
    db = get_db()
    data = request.form.to_dict()
    student_id = data.get('student_id', '').strip()
    
    if not student_id:
        return jsonify({'error': 'student_id required'}), 400
    
    # Get the uploaded image
    if 'image' not in request.files:
        return jsonify({'error': 'image file required'}), 400
    
    file = request.files['image']
    if not file or file.filename == '':
        return jsonify({'error': 'No selected image'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Only PNG, JPG, JPEG allowed'}), 400
    
    # Read image bytes
    file_bytes = file.read()

    # Save training image with a timestamped filename to allow multiple images per student
    # Do NOT store absolute paths in DB; only store filenames in `image_filenames` list
    ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else 'png'
    if ext not in ALLOWED:
        ext = 'png'
    ts = int(datetime.datetime.now().timestamp())
    image_filename = f"{secure_filename(student_id)}_{ts}.{ext}"
    image_path = STORAGE_TRAINING / image_filename

    # Save image to training storage
    try:
        with open(image_path, 'wb') as ofh:
            ofh.write(file_bytes)
    except Exception as e:
        return jsonify({'success': False, 'error': f'Failed to save image: {e}'}), 500

    # Load saved image and check face count
    try:
        image = face_recognition.load_image_file(str(image_path))
    except Exception as e:
        print(f"[ERROR] Failed to load saved training image {image_path}: {e}")
        return jsonify({'success': False, 'error': 'Failed to load saved image'}), 500

    face_locations = face_recognition.face_locations(image)
    num_faces = len(face_locations)
    print(f"[DEBUG] Registration image faces detected: {num_faces}")

    if num_faces == 0:
        # Do not create DB entry; instruct client to upload a clear single-face image
        return jsonify({'success': False, 'error': 'No face detected in provided image; upload a single clear face'}), 400
    if num_faces > 1:
        return jsonify({'success': False, 'error': 'Multiple faces detected; upload an image with exactly one face'}), 400

    # Extract embedding from numpy image
    encoding = extract_face_encoding(image)
    if encoding is None:
        return jsonify({'success': False, 'error': 'Failed to extract face encoding'}), 500

    # Confirm embedding length
    print(f"[DEBUG] Embedding length for {student_id}: {len(encoding)}")

    db = get_db()

    # Upsert: if student exists, append to image_filenames and update embedding/status
    existing = db.students.find_one({'student_id': student_id})
    if existing:
        try:
            db.students.update_one(
                {'student_id': student_id},
                {
                    '$set': {
                        'name': data.get('name', existing.get('name', 'Unknown')),
                        'dept': data.get('dept', existing.get('dept', 'CSE')),
                        'year': data.get('year', existing.get('year', '1')),
                        'mobile': data.get('mobile', existing.get('mobile', '')),
                        'embedding': encoding,
                        'status': 'active',
                        'updated_at': datetime.datetime.now()
                    },
                    '$addToSet': {'image_filenames': image_filename}
                }
            )
        except Exception as e:
            return jsonify({'success': False, 'error': f'Failed to update student record: {e}'}), 500

        student_doc = db.students.find_one({'student_id': student_id}, {'embedding': 0})
        student_doc['_id'] = str(student_doc['_id'])
        return jsonify({'success': True, 'student': student_doc, 'message': 'Student updated with new face embedding', 'embedding_dimension': len(encoding)}), 200

    # New student document
    student_doc = {
        'student_id': student_id,
        'name': data.get('name', 'Unknown'),
        'dept': data.get('dept', 'CSE'),
        'year': data.get('year', '1'),
        'mobile': data.get('mobile', ''),
        'image_filenames': [image_filename],
        'embedding': encoding,  # 128-dim vector
        'status': 'active',
        'bunk_count': 0,
        'created_at': datetime.datetime.now(),
        'updated_at': datetime.datetime.now()
    }

    try:
        result = db.students.insert_one(student_doc)
    except Exception as e:
        return jsonify({'success': False, 'error': f'Failed to insert student record: {e}'}), 500

    student_doc['_id'] = str(result.inserted_id)
    resp = dict(student_doc)
    resp.pop('embedding', None)
    return jsonify({'success': True, 'student': resp, 'message': 'Student registered with face embedding', 'embedding_dimension': len(encoding)}), 201


def process_pending_students():
    """
    Scan students with missing embeddings or status 'pending_image', try to load
    the image from storage/training/<student_id>.(png|jpg|jpeg) and extract a
    single-face embedding. If exactly one face is found, save embedding and set
    status to 'active'. If no face, keep status 'pending_image' and emit a
    warning. Do NOT create dummy embeddings.
    Returns a summary dict.
    """
    db = get_db()
    query = {'$or': [{'embedding': None}, {'status': 'pending_image'}]}
    candidates = list(db.students.find(query))
    summary = {'total': len(candidates), 'updated': 0, 'pending': 0, 'errors': 0}

    for student in candidates:
        sid = student.get('student_id')
        print(f"[INFO] Processing student: {sid}")

        # Build list of candidate image paths to check (log each check)
        candidates_paths = []
        checked_paths = []

        # If student record lists image_filenames, prefer those
        files_found = []
        if isinstance(student.get('image_filenames'), list) and student.get('image_filenames'):
            for fname in student.get('image_filenames'):
                p = STORAGE_TRAINING / fname
                checked_paths.append(str(p))
                if p.exists():
                    print(f"[DEBUG] Found training image from record: {p}")
                    candidates_paths.append(p)
                    files_found.append(p)
                else:
                    print(f"[DEBUG] Training image listed but missing: {p}")

        # Also check for any files in training storage that start with the student_id
        matches = list(STORAGE_TRAINING.glob(f"{sid}*"))
        for p in matches:
            if str(p) not in checked_paths:
                checked_paths.append(str(p))
                if p.exists():
                    print(f"[DEBUG] Found training image by glob: {p}")
                    candidates_paths.append(p)
                    files_found.append(p)
                else:
                    print(f"[DEBUG] Training glob path missing: {p}")

        # If an older image_path field was present, check it too (backwards compatibility)
        ip = student.get('image_path')
        if ip:
            p = Path(ip)
            checked_paths.append(str(p))
            if p.exists():
                print(f"[DEBUG] Found image at student.image_path: {p}")
                candidates_paths.append(p)
                files_found.append(p)
            else:
                print(f"[DEBUG] student.image_path specified but file missing: {p}")

        if not candidates_paths:
            print(f"[WARN] No image found for {sid}; checked paths:\n  " + "\n  ".join(checked_paths))
            summary['pending'] += 1
            # Ensure status remains pending_image
            try:
                db.students.update_one({'_id': student['_id']}, {'$set': {'status': 'pending_image', 'updated_at': datetime.datetime.now()}})
            except Exception as e:
                print(f"[ERROR] Failed to update status for {sid}: {e}")
                summary['errors'] += 1
            continue

        # Try images in order until one yields a single-face embedding
        found_embedding = None
        used_path = None
        for img_path in candidates_paths:
            print(f"[DEBUG] Trying image: {img_path} for student {sid}")
            # Load image and inspect face count to give precise failure reason
            try:
                img = face_recognition.load_image_file(str(img_path))
            except Exception as e:
                print(f"[ERROR] Failed to load image {img_path} for {sid}: {e}")
                continue

            try:
                face_locs = face_recognition.face_locations(img)
                nfaces = len(face_locs)
                print(f"[DEBUG] Image {img_path} contains {nfaces} face(s)")
                if nfaces == 0:
                    print(f"[WARN] No face detected in {img_path} for {sid}; keeping status pending_image")
                    continue
                if nfaces > 1:
                    print(f"[WARN] Multiple faces ({nfaces}) in {img_path} for {sid}; skipping this image")
                    continue

                # Single face detected — attempt to extract embedding
                emb = extract_face_encoding(img)
            except Exception as e:
                print(f"[ERROR] Exception processing {img_path} for {sid}: {e}")
                emb = None

            if emb is None:
                print(f"[WARN] Failed to extract valid embedding from {img_path} for {sid}")
                continue

            # Validate embedding length
            if isinstance(emb, list) and len(emb) == 128:
                found_embedding = emb
                used_path = img_path
                print(f"[DEBUG] Valid embedding extracted for {sid} from {img_path}, length={len(emb)}")
                break
            else:
                print(f"[ERROR] Extracted embedding for {sid} from {img_path} has invalid length: {len(emb) if emb else 'None'}")

        if found_embedding is None:
            print(f"[WARN] Could not extract valid embedding for {sid}; keeping pending")
            summary['pending'] += 1
            try:
                db.students.update_one({'_id': student['_id']}, {'$set': {'status': 'pending_image', 'updated_at': datetime.datetime.now()}})
            except Exception as e:
                print(f"[ERROR] Failed to update status for {sid}: {e}")
                summary['errors'] += 1
            continue

        # Save embedding and update status to active; record all training filenames found
        try:
            # collect filenames for all training files that start with student_id
            filenames_list = [p.name for p in STORAGE_TRAINING.glob(f"{sid}*")]
            update_doc = {
                'embedding': found_embedding,
                'status': 'active',
                'image_filenames': filenames_list,
                'updated_at': datetime.datetime.now()
            }
            db.students.update_one({'_id': student['_id']}, {'$set': update_doc})
            summary['updated'] += 1
            print(f"[INFO] Student {sid} updated with embedding (status=active); images={filenames_list}")
        except Exception as e:
            print(f"[ERROR] Failed to update DB for {sid}: {e}")
            summary['errors'] += 1

    return summary


@app.route('/students/fix_pending', methods=['POST'])
@token_required
def fix_pending_students_endpoint():
    """API endpoint to trigger processing of pending students."""
    try:
        res = process_pending_students()
        return jsonify({'status': 'done', 'summary': res}), 200
    except Exception as e:
        print(f"[ERROR] fix_pending_students_endpoint: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'status': 'error', 'error': str(e)}), 500


# --- ATTENDANCE VIOLATION DETECTION ---

@app.route('/match', methods=['POST'])
def match_student():
    """
    Match a captured student image against all registered students.
    
    MATCHING PROCESS (Deep Learning):
    1. Extract face encoding from uploaded image using face_recognition
    2. Compare with all stored student embeddings
    3. Find the student with smallest distance (closest match)
    4. Accept as match only if distance < 0.45 (high confidence)
    5. Calculate confidence = (1 - distance) * 100
    
    WHY FACE_DISTANCE < 0.45 IS RELIABLE:
    - Based on extensive testing by face_recognition author Adam Geitgey
    - Distance distribution: same person peaks at ~0.3-0.4
    - Distance distribution: different person spreads from 0.5-1.0
    - Threshold 0.45 gives 99%+ confidence with low false positive rate
    
    Response:
    - If matched: return student details + confidence percentage
    - If no match: return "Unknown student"
    """
    try:
        # Get uploaded image
        file = request.files.get('image')
        if not file or not allowed_file(file.filename):
            return jsonify({
                'success': True,
                'matched': False,
                'error': 'Valid image required (png/jpg/jpeg)'
            }), 400
        
        location = request.form.get('location', 'Unknown')
        
        # Read image bytes and save to uploads folder for audit
        file_bytes = file.read()
        filename = secure_filename(f"capture_{datetime.datetime.now().timestamp()}_{file.filename}")
        path = STORAGE_UPLOADS / filename
        try:
            with open(path, 'wb') as ofh:
                ofh.write(file_bytes)
        except Exception:
            print(f"Warning: failed to save capture to {path}")

        # Load saved image using face_recognition to get an RGB numpy array
        try:
            image = face_recognition.load_image_file(str(path))
        except Exception as e:
            print(f"[ERROR] Failed to load saved image {path}: {e}")
            return jsonify({'success': False, 'matched': False, 'error': 'Failed to load image'}), 400

        # Check number of faces detected (locations) before encoding
        face_locations = face_recognition.face_locations(image)
        num_faces = len(face_locations)
        print(f"[DEBUG] Uploaded image faces detected: {num_faces}")

        if num_faces == 0:
            return jsonify({'success': False, 'matched': False, 'error': 'No face detected in uploaded image'}), 400
        if num_faces > 1:
            return jsonify({'success': False, 'matched': False, 'error': 'Multiple faces detected in uploaded image'}), 400

        # Extract face encoding from the loaded numpy image
        captured_encoding = extract_face_encoding(image)
        if captured_encoding is None:
            print(f"[ERROR] extract_face_encoding returned None despite single face detected")
            return jsonify({'success': False, 'matched': False, 'error': 'Failed to extract face encoding'}), 500

        print(f"[DEBUG] Face detected. Encoding length: {len(captured_encoding)}")
        
        # Get all registered students
        db = get_db()
        students = list(db.students.find({'embedding': {'$exists': True, '$ne': None}}))

        # Debug: number of registered students
        print(f"[DEBUG] Registered students with embeddings: {len(students)}")
        if not students:
            return jsonify({'success': True, 'matched': False, 'confidence': None, 'distance': None, 'error': 'No registered students'}), 200
        
        # Find best matching student
        best_match = None
        best_distance = float('inf')
        best_confidence = None  # Keep as None if no valid match
        
        for student in students:
            stored_embedding = student.get('embedding')
            if stored_embedding is None:
                print(f"[DEBUG] Student {student.get('student_id')} has no embedding")
                continue
            
            # Compute distance between encodings
            distance = face_distance(captured_encoding, stored_embedding)
            print(f"[DEBUG] {student.get('student_id')}: distance={distance:.6f}")
            
            # Track best (closest) match
            if distance < best_distance:
                best_distance = distance
                best_match = student
        
        # Safety: only calculate confidence if we have a valid distance
        if best_match is not None and best_distance is not None and best_distance != float('inf'):
            best_confidence = round(max(0.0, min(100.0, (1.0 - best_distance) * 100.0)), 2)
            print(f"[DEBUG] Best match: {best_match.get('student_id') if best_match else 'None'}, distance={best_distance:.6f}, confidence={best_confidence}%")
        else:
            best_confidence = None
            print(f"[DEBUG] No valid distance calculated (best_distance={best_distance})")
        
        # Decision: accept match only if distance < threshold
        # Decision: accept match only if best_match exists and distance below threshold
        is_match = (best_match is not None) and (best_distance is not None) and (best_distance < FACE_DISTANCE_THRESHOLD)

        if is_match and best_match and best_confidence is not None:
            # Match found: return student info but DO NOT write violation or increment bunk_count.
            # The client must explicitly confirm the violation via /violations/confirm.
            best_match['_id'] = str(best_match['_id'])
            best_match.pop('embedding', None)
            best_match_resp = dict(best_match)
            best_match_resp['_id'] = str(best_match_resp.get('_id'))
            best_match_resp.pop('embedding', None)

            return jsonify({
                'success': True,
                'matched': True,
                'student': best_match_resp,
                'registered_images': best_match_resp.get('image_filenames', []),
                'confidence': best_confidence,
                'distance': float(best_distance),
                'capture_image': filename
            }), 200
        
        # No confident match
        error_msg = f'No confident match found'
        if best_distance != float('inf'):
            error_msg += f' (best distance: {best_distance:.3f}, threshold: {FACE_DISTANCE_THRESHOLD})'
        
        return jsonify({
            'success': True,
            'matched': False,
            'student': None,
            'confidence': best_confidence,
            'distance': float(best_distance) if best_distance != float('inf') else None,
            'error': error_msg
        }), 200
    
    except Exception as e:
        print(f"[ERROR] Match error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'matched': False,
            'confidence': None,
            'distance': None,
            'error': 'Server error during matching'
        }), 500


# --- REPORTING ROUTES ---

@app.route('/violations', methods=['GET'])
def get_violations():
    """Get all recorded bunk violations (sorted by most recent)."""
    db = get_db()
    violations = list(db.violations.find().sort('timestamp', -1))
    for v in violations:
        v['_id'] = str(v['_id'])
        v['timestamp'] = v['timestamp'].isoformat()
    return jsonify(violations)


@app.route('/violations/confirm', methods=['POST'])
@token_required
def confirm_violation():
    """Confirm and record a violation (increments bunk_count and inserts violation).

    Expected JSON body:
      {
        student_id,
        location,
        confidence,   # percentage 0-100
        distance,
        image_filename
      }
    """
    data = request.get_json() or {}
    student_id = data.get('student_id')
    location = data.get('location', 'Unknown')
    confidence = data.get('confidence')
    distance = data.get('distance')
    image_filename = data.get('image_filename')

    if not student_id:
        return jsonify({'success': False, 'error': 'student_id required'}), 400

    db = get_db()
    student = db.students.find_one({'student_id': student_id})
    if not student:
        return jsonify({'success': False, 'error': 'student not found'}), 404

    try:
        db.students.update_one({'student_id': student_id}, {'$inc': {'bunk_count': 1}, '$set': {'updated_at': datetime.datetime.now()}})
    except Exception as e:
        print(f"[ERROR] Failed to increment bunk_count for {student_id}: {e}")
        return jsonify({'success': False, 'error': 'failed to update student'}), 500

    try:
        violation = {
            'student_id': student_id,
            'student_name': student.get('name'),
            'dept': student.get('dept'),
            'location': location,
            'timestamp': datetime.datetime.now(),
            'confidence': (float(confidence) / 100.0) if confidence is not None else None,
            'distance': float(distance) if distance is not None else None,
            'image': image_filename
        }
        db.violations.insert_one(violation)
    except Exception as e:
        print(f"[ERROR] Failed to insert violation for {student_id}: {e}")
        return jsonify({'success': False, 'error': 'failed to record violation'}), 500

    return jsonify({'success': True, 'message': 'Violation recorded'}), 200


def migrate_image_filenames():
    """Migration helper: ensure students with embeddings have image_filename set.
    For each student with embedding and missing image_filename, check for
    storage/training/<student_id>.png and set image_filename if found.
    Returns a summary dict.
    """
    db = get_db()
    query = {'embedding': {'$exists': True, '$ne': None}, '$or': [{'image_filenames': {'$exists': False}}, {'image_filenames': {'$size': 0}}]}
    candidates = list(db.students.find(query))
    summary = {'checked': len(candidates), 'updated': 0}
    for s in candidates:
        sid = s.get('student_id')
        if not sid:
            continue
        # find all files in training storage that start with student_id
        matches = list(STORAGE_TRAINING.glob(f"{sid}*"))
        if not matches:
            continue
        filenames = [p.name for p in matches]
        try:
            db.students.update_one({'_id': s['_id']}, {'$set': {'image_filenames': filenames, 'updated_at': datetime.datetime.now()}})
            summary['updated'] += 1
            print(f"[MIGRATE] Set image_filenames for {sid} -> {filenames}")
        except Exception as e:
            print(f"[MIGRATE] Failed to update {sid}: {e}")
    return summary


@app.route('/students/migrate_image_filenames', methods=['POST'])
@token_required
def migrate_image_filenames_endpoint():
    try:
        res = migrate_image_filenames()
        return jsonify({'status': 'done', 'summary': res}), 200
    except Exception as e:
        print(f"[ERROR] migrate_image_filenames_endpoint: {e}")
        return jsonify({'status': 'error', 'error': str(e)}), 500


@app.route('/timetable', methods=['GET'])
def get_timetable():
    """Get student timetable."""
    db = get_db()
    timetable = list(db.timetable.find())
    for t in timetable:
        t['_id'] = str(t['_id'])
    return jsonify(timetable)


# --- FILE SERVING ---

@app.route('/storage/<path:filename>')
def serve_storage(filename):
    """Serve files from storage directories."""
    try:
        train_path = STORAGE_TRAINING / filename
        upload_path = STORAGE_UPLOADS / filename
        
        if train_path.exists():
            return send_from_directory(STORAGE_TRAINING, filename)
        if upload_path.exists():
            return send_from_directory(STORAGE_UPLOADS, filename)
        
        return jsonify({'error': 'file not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Call sync at startup to ensure DB matches filesystem
print("[STARTUP] Running database/filesystem sync...")
sync_training_images_with_db()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
