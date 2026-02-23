from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from services.detection_service import DetectionService
from config import Config
from pathlib import Path
import datetime
import os

detection_bp = Blueprint("detection", __name__)

@detection_bp.route("/match", methods=["POST"])
@jwt_required()
def match_student():
    if 'image' not in request.files:
        return jsonify({"error": "No image uploaded"}), 400
        
    file = request.files['image']
    dept = request.form.get("department")
    section = request.form.get("section")
    
    # Save capture for audit
    os.makedirs(Config.STORAGE_UPLOADS, exist_ok=True)
    filename = f"capture_{datetime.datetime.now().timestamp()}.jpg"
    save_path = Path(Config.STORAGE_UPLOADS) / filename
    file.save(save_path)
    
    try:
        result = DetectionService.match_face(str(save_path), dept, section)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
