import os
import json
import numpy as np
from pathlib import Path

STORAGE_DIR = Path(__file__).parent / "storage"
STUDENTS_FILE = Path(__file__).parent / "students.json"

try:
    import face_recognition
    HAS_FR = True
except Exception:
    HAS_FR = False


def ensure_storage():
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    if not STUDENTS_FILE.exists():
        STUDENTS_FILE.write_text('[]')


def load_students():
    ensure_storage()
    return json.loads(STUDENTS_FILE.read_text())


def save_students(data):
    STUDENTS_FILE.write_text(json.dumps(data, indent=2))


def image_to_embedding(image_path):
    """Return an embedding vector for an image. Uses `face_recognition` if available,
    otherwise falls back to a simple grayscale-resize feature vector.
    """
    image_path = Path(image_path)
    if not image_path.exists():
        return None

    if HAS_FR:
        try:
            img = face_recognition.load_image_file(str(image_path))
            enc = face_recognition.face_encodings(img)
            if not enc:
                return None
            return enc[0]
        except Exception:
            pass

    # Fallback: simple grayscale resized embedding
    import cv2
    img = cv2.imread(str(image_path))
    if img is None:
        return None
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    small = cv2.resize(gray, (64, 64))
    vec = small.flatten().astype('float32') / 255.0
    return vec


def match_embedding(embedding, threshold=0.5):
    """Compare embedding to stored student embeddings and return best match or None.

    If embeddings are not available (face_recognition missing), returns None.
    """
    students = load_students()
    best = None
    best_score = 0.0
    if embedding is None:
        return None, 0.0

    updated = False
    for s in students:
        emb = s.get('embedding')
        # If embedding missing, attempt to compute it from stored image
        if not emb:
            imgname = s.get('image')
            if imgname:
                # check storage first, then design folder
                p1 = STORAGE_DIR / imgname
                p2 = Path(__file__).parent.parent / 'ui_[pics' / imgname
                for p in (p1, p2):
                    if p.exists():
                        e = image_to_embedding(p)
                        if e is not None:
                            s['embedding'] = e.tolist()
                            emb = s['embedding']
                            updated = True
                            break

        if not emb:
            continue

        db_emb = np.array(emb)
        # Ensure same length: if embeddings are different sizes, resize via interpolation
        if db_emb.shape != embedding.shape:
            # simple: truncate or pad with zeros
            minlen = min(db_emb.size, embedding.size)
            db_vec = db_emb.flatten()[:minlen]
            q_vec = embedding.flatten()[:minlen]
            dist = np.linalg.norm(db_vec - q_vec)
        else:
            dist = np.linalg.norm(db_emb - embedding)

        # Convert distance to a confidence-like score (lower distance -> higher confidence)
        score = max(0.0, 1.0 - float(dist))
        if score > best_score:
            best_score = score
            best = s

    if updated:
        save_students(students)

    if best_score >= threshold:
        return best, float(best_score)
    return None, float(best_score)
