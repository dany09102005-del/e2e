from db import get_db

class ReportService:
    @staticmethod
    def get_reports(group_by="violation_type"):
        db = get_db()
        
        valid_groups = {"violation_type", "location", "department"}
        if group_by not in valid_groups:
            group_by = "violation_type"
            
        pipeline = [
            {
                "$group": {
                    "_id": f"${group_by}",
                    "count": {"$sum": 1}
                }
            },
            {
                "$project": {
                    "category": "$_id",
                    "count": 1,
                    "_id": 0
                }
            },
            {"$sort": {"count": -1}}
        ]
        
        breakdown = list(db.violations.aggregate(pipeline))
        total = sum(item["count"] for item in breakdown)
        
        return {
            "total": total,
            "breakdown": breakdown
        }
