from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from services.student_service import StudentService
from utils.auth_decorators import role_required

students_bp = Blueprint("students", __name__)

@students_bp.route("/", methods=["POST"])
@jwt_required()
@role_required("staff")
def register_student():
    data = request.json
    try:
        student_id = StudentService.create_student(data)
        return jsonify({"success": True, "id": student_id}), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

@students_bp.route("/", methods=["GET"])
@jwt_required()
def get_students():
    try:
        students = StudentService.get_students()
        return jsonify(students), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
