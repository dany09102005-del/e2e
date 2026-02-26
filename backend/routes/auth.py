from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required
from services.auth_service import AuthService
from utils.auth_decorators import admin_required

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    
    if not username or not password:
        return jsonify({
            "success": False,
            "message": "Username and password required"
        }), 400
        
    user = AuthService.verify_user(username, password)
    
    if not user:
        return jsonify({
            "success": False,
            "message": "Invalid credentials"
        }), 401
        
    access_token = create_access_token(
        identity=username,
        additional_claims={"role": user.get("role", "staff")}
    )
    
    return jsonify({
        "success": True,
        "data": {
            "access_token": access_token,
            "role": user.get("role", "staff")
        },
        "message": "Login successful"
    }), 200

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
        return jsonify({
            "success": True, 
            "data": {"id": user_id},
            "message": "User created successfully"
        }), 201
    except ValueError as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 400
    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500
