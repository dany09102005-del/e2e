from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from utils.auth_decorators import role_required
from db import get_db
from datetime import datetime, time

dashboard_bp = Blueprint("dashboard", __name__)

@dashboard_bp.route("/kpis", methods=["GET"])
@jwt_required()
@role_required("staff")
def get_dashboard_kpis():
    try:
        db = get_db()
        
        # 1. Total Students
        total_students = db.students.count_documents({})
        
        # 2. Total Violations
        total_violations = db.violations.count_documents({})
        
        # 3. Today's Activity
        today_start = datetime.combine(datetime.utcnow().date(), time.min)
        today_activity = db.violations.count_documents({"timestamp": {"$gte": today_start}})
        
        # 4. Monthly Activity 
        # Aggregate violations by month (e.g., "Jan", "Feb")
        # We'll pull the last 6 months to match the UI chart
        monthly_pipeline = [
            {
                "$group": {
                    "_id": {"$month": "$timestamp"},
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"_id": 1}}
        ]
        month_aggregates = list(db.violations.aggregate(monthly_pipeline))
        
        # Map integer month to abbreviation securely
        month_map = {
            1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "May", 6: "Jun",
            7: "Jul", 8: "Aug", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec"
        }
        
        # Fill a 6-month window ending with current month
        current_month = datetime.utcnow().month
        chart_labels = []
        chart_data = []
        
        # Calculate trailing 6 months
        for i in range(5, -1, -1):
            m = current_month - i
            if m <= 0:
                m += 12
            chart_labels.append(month_map[m])
            # Find if we have data for this month
            matched_count = next((item['count'] for item in month_aggregates if item['_id'] == m), 0)
            chart_data.append(matched_count)
            
        # 5. Determine Most Active Location
        location_pipeline = [
            {
                "$group": {
                    "_id": "$location",
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"count": -1}},
            {"$limit": 1}
        ]
        top_location_agg = list(db.violations.aggregate(location_pipeline))
        most_active_location = "N/A"
        most_active_location_count = 0
        if top_location_agg:
            most_active_location = top_location_agg[0]["_id"] or "Unknown"
            most_active_location_count = top_location_agg[0]["count"]

        # 6. Violations by Department (Bar Chart)
        dept_pipeline = [
            {"$group": {"_id": "$department", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        dept_agg = list(db.violations.aggregate(dept_pipeline))
        dept_labels = [d["_id"] or "Unknown" for d in dept_agg]
        dept_data = [d["count"] for d in dept_agg]
        
        # 7. Violations by Type (Donut Chart)
        type_pipeline = [
            {"$group": {"_id": "$type", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        type_agg = list(db.violations.aggregate(type_pipeline))
        type_labels = [t["_id"] or "Unknown" for t in type_agg]
        type_data = [t["count"] for t in type_agg]
        
        # 8. Recent Activity (Timeline - last 10 violations)
        recent_violations = list(db.violations.find().sort("created_at", -1).limit(10))
        recent_activity = []
        for v in recent_violations:
            dt = v.get("created_at")
            time_str = ""
            if dt:
                delta = datetime.utcnow() - dt
                mins = int(delta.total_seconds() / 60)
                if mins < 1:
                    time_str = "Just now"
                elif mins < 60:
                    time_str = f"{mins} min ago"
                elif mins < 1440:
                    time_str = f"{mins // 60} hr ago"
                else:
                    time_str = f"{mins // 1440} days ago"
                    
            v_type = v.get("type", "Unknown")
            badge = "warning"
            dot = "orange"
            if "bunk" in v_type.lower():
                badge = "critical"
                dot = "red"
            elif "dress" in v_type.lower():
                badge = "info"
                dot = "blue"
            elif "late" in v_type.lower():
                badge = "warning"
                dot = "orange"
                
            recent_activity.append({
                "roll_no": v.get("roll_no", ""),
                "type": v_type,
                "remarks": v.get("remarks", ""),
                "location": v.get("location", ""),
                "status": v.get("status", "Pending"),
                "time": time_str,
                "badge": badge,
                "dot": dot
            })

        return jsonify({
            "success": True,
            "data": {
                "total_students": total_students,
                "total_violations": total_violations,
                "today_activity": today_activity,
                "monthly_chart": {
                    "labels": chart_labels,
                    "data": chart_data
                },
                "most_active_location": {
                    "name": most_active_location,
                    "count": most_active_location_count
                },
                "dept_breakdown": {
                    "labels": dept_labels,
                    "data": dept_data
                },
                "type_breakdown": {
                    "labels": type_labels,
                    "data": type_data
                },
                "recent_activity": recent_activity
            }
        }), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
