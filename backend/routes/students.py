from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required
from services.student_service import StudentService
from utils.auth_decorators import role_required
import os
import uuid
import shutil
import face_recognition
from pathlib import Path
from config import Config
from pymongo.errors import DuplicateKeyError
from db import get_db

students_bp = Blueprint("students", __name__)

@students_bp.route("/", methods=["POST"])
@jwt_required()
@role_required("staff")
def register_student():
    if 'image' not in request.files:
        return jsonify({"success": False, "error": "No image uploaded"}), 400
        
    file = request.files['image']
    
    data = {
        "name": request.form.get("name"),
        "roll_no": request.form.get("roll_no"),
        "department": request.form.get("department", "CSE").upper(),
        "section": request.form.get("section", "A").upper(),
        "year": request.form.get("year"),
        "phone": request.form.get("phone"),
        "email": request.form.get("email"),
        "threshold": request.form.get("threshold"),
    }
    
    if not data["roll_no"] or not data["name"]:
        return jsonify({"success": False, "error": "Missing required fields"}), 400
        
    # Construct storage path
    dept_dir = data["department"]
    sec_dir = data["section"]
    roll_no = data["roll_no"].strip().upper()
    
    # === DEBUG LOGGING ===
    print(f"[REGISTER] Raw roll_no from form: {repr(data['roll_no'])}")
    print(f"[REGISTER] Normalized roll_no:     {repr(roll_no)}")
    print(f"[REGISTER] len(roll_no):            {len(roll_no)}")
    print(f"[REGISTER] Department: {repr(dept_dir)}, Section: {repr(sec_dir)}")
    
    # Pre-validation: Database Source of Truth Check
    db = get_db()
    print(f"[REGISTER] Active DB name: {db.name}")
    print(f"[REGISTER] Students collection indexes: {db.students.index_information()}")
    print(f"[REGISTER] Total documents in students: {db.students.count_documents({})}")
    
    # Exact match check
    exact_match = db.students.find_one({"roll_no": roll_no})
    print(f"[REGISTER] Exact match for {repr(roll_no)}: {exact_match is not None}")
    if exact_match:
        print(f"[REGISTER] FOUND DUPLICATE - _id: {exact_match.get('_id')}, roll_no: {repr(exact_match.get('roll_no'))}, name: {exact_match.get('name')}")
    
    # Case-insensitive regex search for any variant
    regex_matches = list(db.students.find({"roll_no": {"$regex": roll_no, "$options": "i"}}))
    print(f"[REGISTER] Regex matches for {repr(roll_no)}: {len(regex_matches)}")
    for m in regex_matches:
        print(f"  -> _id: {m.get('_id')}, roll_no: {repr(m.get('roll_no'))}, name: {m.get('name')}")
    
    # Also dump ALL roll_nos to check for hidden characters
    all_rolls = [repr(doc.get('roll_no')) for doc in db.students.find({}, {"roll_no": 1})]
    print(f"[REGISTER] All roll_nos in DB: {all_rolls}")
    # === END DEBUG LOGGING ===
    
    if exact_match:
        return jsonify({"success": False, "error": f"Student with Roll Number {roll_no} is already registered."}), 409
    
    storage_dir = Path(Config.STORAGE_TRAINING) / dept_dir / sec_dir / roll_no
    storage_dir.mkdir(parents=True, exist_ok=True)
    
    # Save original image with UUID
    image_filename = f"{uuid.uuid4().hex}.jpeg"
    image_path = storage_dir / image_filename
    file.save(image_path)
    
    try:
        # Load and encode face
        image = face_recognition.load_image_file(str(image_path))
        face_locations = face_recognition.face_locations(image)
        if not face_locations:
            shutil.rmtree(storage_dir, ignore_errors=True)
            return jsonify({"success": False, "error": "No face detected in image"}), 400
            
        encodings = face_recognition.face_encodings(image)
        if not encodings:
            shutil.rmtree(storage_dir, ignore_errors=True)
            return jsonify({"success": False, "error": "Could not extract face encoding"}), 400
            
        data["face"] = {
            "image_filenames": [image_filename],
            "embedding": encodings[0].tolist(),
            "status": "active"
        }
        
        StudentService.create_student(data)
        return jsonify({"success": True, "roll_no": roll_no, "message": "Student registered successfully"}), 201
        
    except DuplicateKeyError:
        # Race condition fallback
        shutil.rmtree(storage_dir, ignore_errors=True)
        return jsonify({"success": False, "error": f"Student with Roll Number {roll_no} is already registered."}), 409
    except Exception as e:
        shutil.rmtree(storage_dir, ignore_errors=True)
        return jsonify({"success": False, "error": str(e)}), 400

@students_bp.route("/", methods=["GET"])
@jwt_required()
def get_students():
    try:
        students = StudentService.get_students()
        return jsonify(students), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@students_bp.route("/<roll_no>/image", methods=["GET"])
def get_student_image(roll_no):
    from db import get_db
    db = get_db()
    student = db.students.find_one({"roll_no": roll_no.upper()})
    
    if not student:
        return jsonify({"success": False, "error": "Student not found"}), 404
        
    dept = student.get("department")
    section = student.get("section")
    
    face_data = student.get("face", {})
    image_filenames = face_data.get("image_filenames", [])
    
    if not dept or not section or not image_filenames:
        return jsonify({"success": False, "error": "Image profile incomplete"}), 404
        
    target_filename = image_filenames[-1]    
    image_path = Path(Config.STORAGE_TRAINING) / dept / section / roll_no.upper() / target_filename
    
    if not os.path.exists(image_path):
        # Fallback to check if image is pending or simply not located whereexpected
        return jsonify({"success": False, "error": "Image not found on server"}), 404
        
    return send_file(image_path, mimetype='image/jpeg', max_age=31536000)

@students_bp.route("/debug/db-state", methods=["GET"])
def debug_db_state():
    """Temporary diagnostic endpoint - REMOVE IN PRODUCTION"""
    db = get_db()
    indexes = db.students.index_information()
    count = db.students.count_documents({})
    all_students = []
    for doc in db.students.find({}, {"roll_no": 1, "name": 1, "department": 1, "section": 1, "_id": 1}):
        doc["_id"] = str(doc["_id"])
        all_students.append(doc)
    return jsonify({
        "database": db.name,
        "total_students": count,
        "indexes": {k: str(v) for k, v in indexes.items()},
        "students": all_students
    }), 200
