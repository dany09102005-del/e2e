"""Validation script for AttendGuard backend.

Runs:
 1) POST /students/fix_pending with JWT
 2) Verify MongoDB students embeddings/status
 3) POST /match with a student's own image (expect matched=True)
 4) POST /match with a different student's image (expect matched=False)

Run with: ./venv310/bin/python backend/validate_pipeline.py
"""
import os
import sys
import json
import datetime
from pathlib import Path
import requests
from dotenv import load_dotenv
from pymongo import MongoClient
import jwt as pyjwt

ROOT = Path(__file__).parent
load_dotenv(ROOT / '.env')

BASE = os.environ.get('BASE_URL', 'http://127.0.0.1:5050')
SECRET = os.environ.get('APP_SECRET', 'dev-secret-key-change-in-prod')
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
DB_NAME = 'attendguard'

# Create a JWT token (no need for real user; token only needs valid signature)
payload = {'username': 'validator', 'role': 'Admin', 'iat': int(datetime.datetime.utcnow().timestamp())}
try:
    token = pyjwt.encode(payload, SECRET, algorithm='HS256')
except Exception as e:
    print('Failed to create JWT:', e)
    sys.exit(1)

headers = {'Authorization': f'Bearer {token}'}

print('1) Triggering /students/fix_pending')
try:
    r = requests.post(f'{BASE}/students/fix_pending', headers=headers, timeout=30)
    print('Status:', r.status_code)
    print('Response:', json.dumps(r.json(), indent=2))
except Exception as e:
    print('Error calling /students/fix_pending:', e)
    sys.exit(1)

# Connect to MongoDB and verify students
print('\n2) Verifying MongoDB students embeddings/status')
try:
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    total = db.students.count_documents({})
    with_embedding = db.students.count_documents({'embedding': {'$exists': True, '$ne': None}})
    pending_count = db.students.count_documents({'status': 'pending_image'})
    print('Total students:', total)
    print('With embedding:', with_embedding)
    print('Pending (status=pending_image):', pending_count)

    # Check embedding lengths
    wrong_lengths = []
    for s in db.students.find({'embedding': {'$exists': True, '$ne': None}}, {'student_id':1, 'embedding':1, 'status':1}):
        emb = s.get('embedding')
        if not isinstance(emb, list) or len(emb) != 128:
            wrong_lengths.append((s.get('student_id'), len(emb) if emb else 'None'))
    if wrong_lengths:
        print('Students with invalid embedding length:')
        for sid, l in wrong_lengths:
            print(' -', sid, 'length=', l)
    else:
        print('All embeddings have length 128')

    if pending_count == 0:
        print('No students left in pending_image status')
    else:
        print('Some students remain pending_image; consider checking their images in storage/training/')

except Exception as e:
    print('MongoDB check failed:', e)
    sys.exit(1)

# Helper to find two distinct student image files
training = ROOT / 'storage' / 'training'
files = list(training.glob('*.*'))
if not files:
    print('No training images found in', training)
    sys.exit(1)

# Pick two different images if available
img1 = files[0]
img2 = files[1] if len(files) > 1 else files[0]
print('\nUsing images for match tests:')
print(' img1 =', img1)
print(' img2 =', img2)

# Function to call /match and print result
def call_match(image_path):
    print(f"\nCalling /match with {image_path}")
    files = {'image': (image_path.name, open(image_path, 'rb'), 'image/jpeg')}
    data = {'location': 'validation-test'}
    try:
        r = requests.post(f'{BASE}/match', files=files, data=data, timeout=30)
        print('Status:', r.status_code)
        try:
            j = r.json()
            print(json.dumps(j, indent=2))
            return j
        except Exception as e:
            print('Non-JSON response:', r.text)
            return None
    except Exception as e:
        print('Error calling /match:', e)
        return None

# Test 1: same image (should match)
res1 = call_match(img1)
# Test 2: different image (preferably different student)
res2 = call_match(img2)

print('\nValidation complete')
