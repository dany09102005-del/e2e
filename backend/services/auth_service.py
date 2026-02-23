import bcrypt
from datetime import datetime
from flask_jwt_extended import create_access_token
from db import get_db

class AuthService:
    @staticmethod
    def hash_password(password):
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    @staticmethod
    def check_password(password, hashed):
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

    @staticmethod
    def create_user(username, password, role="staff"):
        db = get_db()
        if db.users.find_one({"username": username}):
            raise ValueError(f"User {username} already exists")
        
        user_doc = {
            "username": username,
            "password_hash": AuthService.hash_password(password),
            "role": role,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = db.users.insert_one(user_doc)
        return str(result.inserted_id)

    @staticmethod
    def login(username, password):
        db = get_db()
        user = db.users.find_one({"username": username})
        
        if not user or not AuthService.check_password(password, user["password_hash"]):
            return None
        
        # Create token with role in identity or claims
        # flask-jwt-extended 4.x uses distinct identity and additional_claims
        access_token = create_access_token(
            identity=username,
            additional_claims={"role": user["role"]}
        )
        
        return {
            "access_token": access_token,
            "role": user["role"]
        }
