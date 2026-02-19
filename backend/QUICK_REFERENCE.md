# ⚡ Quick Reference - Simple Image Format

## Storage Format (Final)
```
storage/training/
├── 23BQ1A0566.png          ← Simple: student_id.png
├── 23BQ1A0592.jpg
├── 23BQ1A05A9.png
└── 24BQ5A0515.jpg
```

**Rule**: One file per student, filename = student_id.{png|jpg|jpeg}

---

## 3 Ways to Add Images

### Method 1: Copy Existing Photos (Simplest)
```bash
# Copy your photos to storage/training with student_id as filename
cp /path/to/rahul_photo.jpg storage/training/23BQ1A0566.jpg
cp /path/to/priya_photo.jpg storage/training/23BQ1A0592.jpg

# Verify
ls storage/training/
```

### Method 2: Batch Rename Script
```bash
#!/bin/bash
# If photos are already collected and need renaming

# Edit the mapping as needed
declare -A student_photos=(
  ["23BQ1A0566"]="student_photos/rahul.jpg"
  ["23BQ1A0592"]="student_photos/priya.jpg"
  ["23BQ1A05A9"]="student_photos/amit.jpg"
)

# Copy files with correct names
for student_id in "${!student_photos[@]}"; do
  src="${student_photos[$student_id]}"
  dst="storage/training/${student_id}.jpg"
  if [ -f "$src" ]; then
    cp "$src" "$dst"
    echo "✓ Copied: $student_id"
  else
    echo "⚠ Missing: $src"
  fi
done
```

### Method 3: API Upload (New Student Registration)
```bash
# Get token
TOKEN=$(curl -s -X POST http://127.0.0.1:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Register new student with image
curl -X POST http://127.0.0.1:5000/students \
  -H "Authorization: Bearer $TOKEN" \
  -F "student_id=23NEW999" \
  -F "name=New Student" \
  -F "dept=CSE" \
  -F "year=2" \
  -F "image=@/path/to/photo.jpg"
```

---

## Initialize & Test

### Step 1: Load Database
```bash
cd /home/sudhakar-reddy/Public/e2e/backend
python initialize.py
```
**Output**: Shows ✓ for students with images, ⚠ for missing

### Step 2: Start Backend
```bash
python app.py
# Server: http://127.0.0.1:5000
```

### Step 3: Test Endpoints
```bash
# Get students
curl http://127.0.0.1:5000/students

# Test face matching
curl -X POST http://127.0.0.1:5000/match \
  -H "Authorization: Bearer TOKEN" \
  -F "image=@test_photo.jpg" \
  -F "class=CSE-B1"
```

---

## Image Requirements Checklist

- [ ] Exactly **1 person per photo**
- [ ] **Clear face** (not blurry, sunglasses OK but not ideal)
- [ ] **Good lighting** (well-lit, no harsh shadows)
- [ ] Face **fills 30-70%** of image
- [ ] **High quality** (minimum 200x200 pixels)
- [ ] **Recent photo** (within last year)
- [ ] **PNG or JPG** format

---

## Filename Rules (IMPORTANT!)

✅ **CORRECT**:
```
23BQ1A0566.png          (uppercase, exact match)
23BQ1A0566.jpg
23bq1a0567.png          (lowercase, exact match)
24BQ5A0515.jpg
```

❌ **WRONG**:
```
23bq1a0566.png          (case mismatch with 23BQ1A0566)
23BQ1A0566_photo.png    (extra characters)
23BQ1A0566              (missing extension)
photo_23BQ1A0566.jpg    (wrong filename format)
```

---

## Verify Installation

```bash
# Count images
ls storage/training/ | wc -l

# List all images
ls -lh storage/training/

# Check MongoDB
python3 << 'EOF'
from pymongo import MongoClient
db = MongoClient()['attendguard']
total = db.students.count_documents({})
with_embed = db.students.count_documents({'embedding': {'$ne': None}})
print(f"Students: {total}, With embeddings: {with_embed}")
EOF
```

---

## API Response Examples

### Success (Register Student)
```json
{
  "status": "created",
  "student_id": "23BQ1A0577",
  "message": "Student registered with face embedding",
  "embedding_dimension": 128
}
```

### Success (Face Match)
```json
{
  "status": "success",
  "match": true,
  "student_id": "23BQ1A0566",
  "name": "Rahul Kumar",
  "confidence": 95.5,
  "distance": 0.045
}
```

### Error (No Face)
```json
{
  "error": "Face detection failed: no face or multiple faces detected",
  "details": "Ensure image has exactly one clear face"
}
```

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| "Training image not found" | File missing | Copy photo to `/storage/training/<student_id>.png` |
| "Face detection failed" | 0 or >1 faces | Use clear photo with exactly 1 person |
| "No face" in matching | Image quality | Ensure good lighting, clear face |
| "Case mismatch" | Filename wrong | Match case: `23BQ1A0566` ≠ `23bq1a0566` |

---

## System Commands

```bash
# Quick start (from backend directory)
cd /home/sudhakar-reddy/Public/e2e/backend

# Prepare images (copy your photos)
cp /path/photos/*.jpg storage/training/  # Then rename manually

# Initialize database
python initialize.py

# Start server
python app.py

# In another terminal, test
curl http://127.0.0.1:5000/students
```

---

**Format**: Simple, single image per student  
**Status**: ✅ Production Ready  
**Last Updated**: February 18, 2026
