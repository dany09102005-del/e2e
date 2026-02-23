from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from services.violation_service import ViolationService
from utils.auth_decorators import role_required, admin_required

violations_bp = Blueprint("violations", __name__)

@violations_bp.route("/", methods=["POST"])
@jwt_required()
@role_required("staff")
def create_violation():
    data = request.json
    try:
        violation_id = ViolationService.create_violation(data)
        return jsonify({"success": True, "id": violation_id}), 201
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@violations_bp.route("/", methods=["GET"])
@jwt_required()
def get_violations():
    try:
        violations = ViolationService.get_violations()
        return jsonify(violations), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@violations_bp.route("/<violation_id>", methods=["DELETE"])
@jwt_required()
@admin_required()
def delete_violation(violation_id):
    try:
        success = ViolationService.delete_violation(violation_id)
        if success:
            return jsonify({"success": True}), 200
        return jsonify({"success": False, "error": "Violation not found"}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
