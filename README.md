Student Attendance Violation Detection — Scaffold
````markdown
Student Attendance Violation Detection — Quick Start

This repository runs a Flask backend (`backend/`) and a frontend (`frontend/`).

Use the project's Python virtual environment `venv310` (included) or create one.

Backend quick start (recommended):

1. Create / activate virtualenv and install dependencies (only if `venv310` missing):

```bash
cd /home/sudhakar-reddy/Public/e2e/backend
# create venv if not present
python3 -m venv venv310
source venv310/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

2. Start the backend (development server):

```bash
source venv310/bin/activate
python app.py
# Server runs on http://127.0.0.1:5000
```

Alternatively, use the helper script (makes venv and installs requirements if needed):

```bash
cd /home/sudhakar-reddy/Public/e2e/backend
./start.sh
```

Frontend quick test (dev server):

```bash
cd frontend
npm install
npm start
```

Important notes:
- The system uses deep-learning face embeddings via the `face_recognition` package (dlib).
- Student images are expected in `backend/storage/training/` named as `<student_id>.(jpg|jpeg|png)`.
- Embeddings are stored in MongoDB (`attendguard` database).
- Do NOT use LBPH or create `model.yml`; matching uses 128-dim deep-learning embeddings only.

If you see import resolution warnings in your editor, ensure your Python interpreter is set to `venv310` so imports (Flask, numpy, pymongo, face_recognition) are resolved.

````
