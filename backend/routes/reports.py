from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from services.report_service import ReportService
from utils.auth_decorators import role_required

reports_bp = Blueprint("reports", __name__)

@reports_bp.route("/", methods=["GET"])
@jwt_required()
@role_required("staff")
def get_reports():
    group_by = request.args.get("group_by", "violation_type")
    try:
        reports = ReportService.get_reports(group_by)
        return jsonify(reports), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
