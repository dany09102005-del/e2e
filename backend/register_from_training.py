#!/usr/bin/env python3
"""
Register students from images in storage/training/ by extracting deep-learning
embeddings using face_recognition and upserting into MongoDB.

Requirements implemented:
- Reads files: storage/training/<student_id>.(jpg|jpeg|png)
- Extracts student_id from filename (stem)
- Loads image with face_recognition.load_image_file()
- Extracts face encoding via face_recognition.face_encodings()
- Ensures exactly one face per image; otherwise skips
- Upserts student document into MongoDB with embedding (128 floats)
- Adds debug prints for processing, success, and failures

Notes:
- Uses deep-learning embeddings only (no LBPH, no model.yml)
- Embeddings are 128-dimensional vectors produced by dlib's ResNet model.
  These embeddings are compared using Euclidean distance during matching.
  Lower distance => more similar faces. A typical threshold is 0.45.

Run:
    python register_from_training.py
"""

import os
import sys
import io
from pathlib import Path
from datetime import datetime

# suppress face_recognition warnings on import
old_stderr = sys.stderr
sys.stderr = io.StringIO()
try:
    import face_recognition
    import numpy as np
    from pymongo import MongoClient
finally:
    sys.stderr = old_stderr

ROOT = Path(__file__).parent
STORAGE_TRAINING = ROOT / 'storage' / 'training'
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
DB_NAME = 'attendguard'

ALLOWED_EXT = {'.png', '.jpg', '.jpeg'}


def is_image_file(p: Path):
    return p.suffix.lower() in ALLOWED_EXT


def process_image_file(path: Path, db):
    """Process a single image file and upsert student in DB.

    Returns True if registration (upsert) occurred with a valid embedding,
    False if skipped (no/multiple faces or error).
    """
    student_id = path.stem  # filename without extension

    print(f"Processing: {path.name} -> student_id={student_id}")

    try:
        image = face_recognition.load_image_file(str(path))
    except Exception as e:
        print(f"  ⚠ Failed to load image: {e}")
        return False

    # detect faces
    locations = face_recognition.face_locations(image)
    encodings = face_recognition.face_encodings(image, locations)

    if len(encodings) == 0:
        print("  ✗ No face detected — skipping")
        return False
    if len(encodings) > 1:
        print(f"  ✗ Multiple faces detected ({len(encodings)}) — skipping")
        return False

    embedding = encodings[0]
    if embedding.shape[0] != 128:
        print(f"  ✗ Unexpected embedding size: {embedding.shape} — skipping")
        return False

    embedding_list = [float(x) for x in embedding.tolist()]

    # Build document per requirements
    now = datetime.utcnow()
    student_doc = {
        'student_id': student_id,
        'name': student_id,
        'dept': 'Unknown',
        'year': 'Unknown',
        'mobile': 'Not Provided',
        'embedding': embedding_list,
        'bunk_count': 0,
        'updated_at': now,
    }

    # Upsert: set created_at only if inserting
    try:
        result = db.students.update_one(
            {'student_id': student_id},
            {'$set': student_doc, '$setOnInsert': {'created_at': now}},
            upsert=True
        )
        if result.upserted_id:
            print(f"  ✓ Registered (inserted) {student_id}")
        else:
            print(f"  ✓ Upserted (updated) {student_id}")
        return True
    except Exception as e:
        print(f"  ⚠ DB upsert failed for {student_id}: {e}")
        return False


def main():
    if not STORAGE_TRAINING.exists():
        print(f"Storage folder not found: {STORAGE_TRAINING}")
        return 1

    # Connect to MongoDB
    try:
        client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
        client.server_info()
        db = client[DB_NAME]
        print("✓ Connected to MongoDB")
    except Exception as e:
        print(f"✗ MongoDB connection failed: {e}")
        return 1

    files = sorted([p for p in STORAGE_TRAINING.iterdir() if p.is_file() and is_image_file(p)])

    if not files:
        print("No image files found in storage/training/")
        return 0

    total = 0
    success = 0
    skipped = 0

    for p in files:
        total += 1
        ok = process_image_file(p, db)
        if ok:
            success += 1
        else:
            skipped += 1

    print(f"\nDone. Processed {total} files: {success} registered, {skipped} skipped")

    return 0


if __name__ == '__main__':
    sys.exit(main())
