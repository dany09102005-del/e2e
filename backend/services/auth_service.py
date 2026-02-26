import bcrypt
from datetime import datetime
from db import get_db

class AuthService:
    @staticmethod
    def create_user(username, password, role="staff"):
        db = get_db()
        if db.users.find_one({"username": username}):
            raise ValueError(f"User {username} already exists")
        
        hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
        password_hash = hashed.decode("utf-8")
        
        user_doc = {
            "username": username,
            "password_hash": password_hash,
            "role": role,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = db.users.insert_one(user_doc)
        return str(result.inserted_id)

    @staticmethod
    def verify_user(username, password):
        db = get_db()
        print("Using DB:", db.name)
        user = db.users.find_one({"username": username})
        print("User found:", user)
        
        if not user:
            return None
            
        stored_hash = user["password_hash"]
        print("Stored hash type:", type(stored_hash))
        
        if isinstance(stored_hash, str):
            stored_hash = stored_hash.encode("utf-8")
            
        print("Password match result:", bcrypt.checkpw(password.encode("utf-8"), stored_hash))
        
        if not bcrypt.checkpw(password.encode("utf-8"), stored_hash):
            return None
            
        return user
