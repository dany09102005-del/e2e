import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/")
    MONGO_DB = os.getenv("MONGO_DB", "GuardDB")
    SECRET_KEY = os.getenv("APP_SECRET", "super-secret-key")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jwt-super-secret-key")
    JWT_ACCESS_TOKEN_EXPIRES = 3600  # 1 hour
    
    # Face recognition settings
    FACE_DISTANCE_THRESHOLD = 0.45
    
    # Storage settings
    STORAGE_TRAINING = "storage/training"
    STORAGE_UPLOADS = "storage/uploads"
