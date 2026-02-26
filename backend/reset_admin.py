from pymongo import MongoClient
import bcrypt

client = MongoClient("mongodb://localhost:27017/")
db = client["GuardDB"]

new_password = "admin123"

hashed = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

db.users.update_one(
    {"username": "admin"},
    {"$set": {"password_hash": hashed}}
)

print("Admin password reset successfully")
