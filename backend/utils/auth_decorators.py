from functools import wraps
from flask_jwt_extended import get_jwt, verify_jwt_in_request
from flask import jsonify

def role_required(required_role):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            if claims.get("role") != required_role and claims.get("role") != "admin":
                return jsonify({"msg": "Forbidden: Requires role " + required_role}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def admin_required():
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            if claims.get("role") != "admin":
                return jsonify({"msg": "Forbidden: Admin access required"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator
