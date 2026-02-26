from pymongo import MongoClient, ASCENDING
from config import Config

def get_db_client():
    client = MongoClient(Config.MONGO_URL)
    return client

def get_db():
    client = get_db_client()
    return client[Config.MONGO_DB]

def init_db():
    db = get_db()
    
    # Drop stale indexes from old schema (student_id is no longer used)
    stale_indexes = ["student_id_1"]
    for idx_name in stale_indexes:
        try:
            db.students.drop_index(idx_name)
            print(f"[INIT_DB] Dropped stale index: {idx_name}")
        except Exception:
            pass  # Index doesn't exist, safe to ignore
    
    # Students Indexes
    db.students.create_index([("roll_no", ASCENDING)], unique=True)
    db.students.create_index([("department", ASCENDING)])
    db.students.create_index([("section", ASCENDING)])
    
    # Violations Indexes
    db.violations.create_index([("student_id", ASCENDING)])
    db.violations.create_index([("violation_type", ASCENDING)])
    db.violations.create_index([("location", ASCENDING)])
    db.violations.create_index([("timestamp", ASCENDING)])
    db.violations.create_index([("status", ASCENDING)])
    
    print(f"Initialized Database: {Config.MONGO_DB} with indexes.")

if __name__ == "__main__":
    init_db()
