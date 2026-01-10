#!/usr/bin/env python3
"""
Sync students collection from images in storage/training/

For each file named <student_id>_*.jpg in storage/training/ this script:
- extracts `student_id` from the filename
- computes an OpenCV-based embedding (grayscale 64x64 normalized vector)
- updates the existing student document's `image` and `embedding` fields
  or creates a minimal student document if none exists (safe upsert)

Run:
    ./sync_students_from_training.py

Requires: opencv-python, numpy, pymongo, python-dotenv
"""
import os
import json
import datetime
from pathlib import Path
import cv2
import numpy as np
from pymongo import MongoClient
from dotenv import load_dotenv

ROOT = Path(__file__).parent
STORAGE_TRAINING = ROOT / 'storage' / 'training'
ALLOWED = {'.png', '.jpg', '.jpeg'}

# Load environment
load_dotenv(ROOT / '.env')
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
DB_NAME = os.environ.get('DB_NAME', 'attendguard')


def get_db():
    client = MongoClient(MONGO_URL)
    return client[DB_NAME]


def compute_embedding_from_path(path: Path):
    """Decode image safely and return normalized 64x64 grayscale flattened vector or None."""
    try:
        # Read raw bytes
        arr = np.fromfile(str(path), dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            # fallback
            img = cv2.imread(str(path))
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


def main():
    db = get_db()
    if not STORAGE_TRAINING.exists():
        print(f"Training folder not found: {STORAGE_TRAINING}")
        return

    files = [p for p in STORAGE_TRAINING.iterdir() if p.is_file() and p.suffix.lower() in ALLOWED]
    if not files:
        print("No training images found in", STORAGE_TRAINING)
        return

    updated = 0
    created = 0
    errors = 0

    for p in files:
        name = p.name
        # Accept both formats: '<student_id>_rest.ext' or '<student_id>.ext'
        if '_' in name:
            student_id = name.split('_', 1)[0]
        else:
            student_id = name.rsplit('.', 1)[0]
        emb = compute_embedding_from_path(p)
        if emb is None:
            print(f"Warning: failed to compute embedding for {name}")
            errors += 1
            continue

        now = datetime.datetime.now()
        # Update existing student or create minimal record
        res = db.students.update_one(
            {'student_id': student_id},
            {'$set': {
                'image': name,
                'embedding': emb,
                'updated_at': now
            },
             '$setOnInsert': {
                'created_at': now,
                'name': student_id,
                'dept': 'Unknown',
                'year': 'Unknown',
                'mobile': ''
            }
            },
            upsert=True
        )
        if res.matched_count:
            updated += 1
        else:
            created += 1

        print(f"Synced {name} -> student_id={student_id}")

    print("\nSummary:")
    print(f"  files processed: {len(files)}")
    print(f"  updated existing students: {updated}")
    print(f"  created new students: {created}")
    print(f"  errors: {errors}")


if __name__ == '__main__':
    main()
