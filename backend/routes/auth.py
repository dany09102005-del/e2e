from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from services.auth_service import AuthService
from utils.auth_decorators import admin_required

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    
    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400
        
    result = AuthService.login(username, password)
    if not result:
        return jsonify({"error": "Invalid credentials"}), 401
        
    return jsonify(result), 200

@auth_bp.route("/create-user", methods=["POST"])
@jwt_required()
@admin_required()
def create_user():
    data = request.json
    try:
        user_id = AuthService.create_user(
            username=data.get("username"),
            password=data.get("password"),
            role=data.get("role", "staff")
        )
        return jsonify({"success": True, "id": user_id}), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500
