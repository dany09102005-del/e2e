Student Attendance Violation Detection — Scaffold

This repository contains a minimal scaffold for the "Student Attendance Violation Detection System".

Backend: Flask app in `backend/`
Frontend: React app in `frontend/`

Quick start (backend):

1. Create a virtualenv and install dependencies:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
```

2. Run the backend:

```bash
export FLASK_APP=backend/app.py
flask run --host=0.0.0.0 --port=5000
```

Frontend quick test (dev server):

```bash
cd frontend
npm install
npm start
```

Notes:
- The face-matching code uses `face_recognition` if available; otherwise it falls back to a mock matcher for demo purposes.
- This scaffold stores student records in `backend/students.json` and images in `backend/storage/`.
