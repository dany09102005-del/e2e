from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import Config
from db import init_db, get_db
from routes.students import students_bp
from routes.violations import violations_bp
from routes.reports import reports_bp
from routes.auth import auth_bp
from routes.detection import detection_bp
from routes.dashboard import dashboard_bp
from services.auth_service import AuthService

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    CORS(app)
    JWTManager(app)
    
    # Initialize DB and Indexes
    with app.app_context():
        init_db()
        # Create an initial admin user if none exists
        db = get_db()
        if not db.users.find_one({"username": "admin"}):
            AuthService.create_user("admin", "admin123", "admin")
            print("Initial admin user created: admin / admin123")
    
    # Register Blueprints
    app.register_blueprint(students_bp, url_prefix="/api/students")
    app.register_blueprint(violations_bp, url_prefix="/api/violations")
    app.register_blueprint(reports_bp, url_prefix="/api/reports")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(detection_bp, url_prefix="/api/detection")
    app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")
    
    @app.route("/ping")
    def ping():
        return {"status": "ok"}
        
    return app

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
