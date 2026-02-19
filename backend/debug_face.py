#!/usr/bin/env python3
"""
Debug script to test face extraction and embedding.
Run this to diagnose "Confidence: NaN" issues.

Usage:
    python debug_face.py <path_to_image>

Example:
    python debug_face.py storage/training/23BQ1A0521.jpg
    python debug_face.py captured_photo.jpg
"""

import sys
import os
import io
from pathlib import Path

# Suppress face_recognition setup warnings
old_stderr = sys.stderr
sys.stderr = io.StringIO()
try:
    import face_recognition
    import numpy as np
finally:
    sys.stderr = old_stderr

def debug_face_extraction(image_path):
    """Debug face extraction from an image."""
    
    print(f"\n{'='*70}")
    print(f"🔍 FACE EXTRACTION DEBUG")
    print(f"{'='*70}\n")
    
    # Check file exists
    if not os.path.exists(image_path):
        print(f"❌ ERROR: File not found: {image_path}")
        return False
    
    file_size = os.path.getsize(image_path)
    print(f"✓ File found: {image_path}")
    print(f"✓ File size: {file_size} bytes\n")
    
    try:
        # Step 1: Load image
        print("Step 1: Loading image...")
        image = face_recognition.load_image_file(image_path)
        print(f"  ✓ Image loaded")
        print(f"  ✓ Image shape: {image.shape} (height, width, channels)\n")
        
        # Step 2: Detect faces
        print("Step 2: Detecting faces...")
        face_locations = face_recognition.face_locations(image)
        num_faces = len(face_locations)
        print(f"  ✓ Faces detected: {num_faces}\n")
        
        if num_faces == 0:
            print("❌ PROBLEM: No faces detected!")
            print("\n💡 Solutions:")
            print("  1. Ensure image has a clear, frontal face")
            print("  2. Face should fill 30-70% of image")
            print("  3. Avoid blurry images, poor lighting")
            print("  4. Try a different photo")
            return False
        
        if num_faces > 1:
            print(f"❌ PROBLEM: Multiple faces detected ({num_faces})")
            print("  System requires exactly 1 face per image")
            print("  Use a photo with only one person")
            return False
        
        # Step 3: Extract encodings
        print("Step 3: Extracting face encodings...")
        encodings = face_recognition.face_encodings(image)
        num_encodings = len(encodings)
        print(f"  ✓ Encodings extracted: {num_encodings}\n")
        
        if num_encodings == 0:
            print("❌ PROBLEM: Face detected but encoding failed!")
            print("  This is rare. Try with a different image.")
            return False
        
        if num_encodings > 1:
            print(f"❌ PROBLEM: Multiple encodings extracted ({num_encodings})")
            return False
        
        # Step 4: Analyze embedding
        print("Step 4: Analyzing embedding...")
        embedding = encodings[0]
        print(f"  ✓ Embedding dimension: {embedding.shape} (should be 128)")
        print(f"  ✓ Embedding dtype: {embedding.dtype}")
        print(f"  ✓ Min value: {embedding.min():.4f}")
        print(f"  ✓ Max value: {embedding.max():.4f}")
        print(f"  ✓ Mean value: {embedding.mean():.4f}")
        print(f"  ✓ Std dev: {embedding.std():.4f}\n")
        
        if embedding.shape != (128,):
            print(f"❌ ERROR: Embedding shape is {embedding.shape}, expected (128,)")
            return False
        
        # Step 5: Test distance calculation
        print("Step 5: Testing distance calculation...")
        test_embedding = np.random.randn(128).astype('float32')
        distance = float(np.linalg.norm(embedding - test_embedding))
        print(f"  ✓ Distance to random vector: {distance:.4f}")
        
        if np.isnan(distance) or np.isinf(distance):
            print(f"❌ PROBLEM: Distance is {distance}")
            return False
        
        print(f"  ✓ Distance is valid\n")
        
        # Success!
        print(f"{'='*70}")
        print(f"✅ SUCCESS - Face extraction working correctly!")
        print(f"{'='*70}\n")
        
        print(f"Summary:")
        print(f"  • Faces in image: {num_faces}")
        print(f"  • Embedding dimension: {embedding.shape[0]}")
        print(f"  • Embedding is valid: Yes")
        print(f"  • Ready for matching: Yes\n")
        
        return True
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_database_embeddings():
    """Check stored embeddings in database."""
    print(f"\n{'='*70}")
    print(f"📊 DATABASE EMBEDDINGS CHECK")
    print(f"{'='*70}\n")
    
    try:
        from pymongo import MongoClient
        
        client = MongoClient('mongodb://localhost:27017/', serverSelectionTimeoutMS=2000)
        db = client['attendguard']
        
        # Count students
        total = db.students.count_documents({})
        with_embedding = db.students.count_documents({'embedding': {'$exists': True, '$ne': None}})
        
        print(f"Total students: {total}")
        print(f"With embeddings: {with_embedding}")
        print(f"Without embeddings: {total - with_embedding}\n")
        
        # Check sample embedding
        sample = db.students.find_one({'embedding': {'$exists': True, '$ne': None}})
        if sample:
            embedding = sample.get('embedding')
            print(f"Sample student: {sample.get('student_id')} ({sample.get('name')})")
            print(f"  • Embedding type: {type(embedding)}")
            print(f"  • Embedding length: {len(embedding) if isinstance(embedding, (list, tuple)) else 'N/A'}")
            if isinstance(embedding, list) and len(embedding) > 0:
                print(f"  • First value: {embedding[0]:.4f}")
                print(f"  • Is valid: {'✓ Yes' if isinstance(embedding[0], (int, float)) else '✗ No'}")
        else:
            print("❌ No students with embeddings found!")
        
        print()
        return True
        
    except Exception as e:
        print(f"⚠️  Could not check database: {e}")
        print("Make sure MongoDB is running: mongod\n")
        return False


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("\n📸 Face Extraction Debug Tool\n")
        print("Usage: python debug_face.py <image_path>\n")
        print("Examples:")
        print("  python debug_face.py storage/training/23BQ1A0521.jpg")
        print("  python debug_face.py captured_photo.png")
        print()
        
        # Offer to check database instead
        test_database_embeddings()
    else:
        image_path = sys.argv[1]
        
        # Test face extraction
        success = debug_face_extraction(image_path)
        
        # Also check database
        test_database_embeddings()
        
        # Exit with status
        sys.exit(0 if success else 1)
