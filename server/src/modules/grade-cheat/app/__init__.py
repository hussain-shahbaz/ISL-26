"""Flask application factory"""

from flask import Flask, request, jsonify
from app.config import Config


def create_app():
    """Create and configure Flask application"""
    app = Flask(__name__)
    app.config.from_object(Config)

    # Service-to-service auth: only the gateway (which forwards the shared
    # SERVICE_SECRET) may call this service, mirroring the other microservices.
    # Health checks stay public for Docker/monitoring. Enforced only when a
    # secret is configured, so local dev without one stays frictionless.
    @app.before_request
    def _verify_service_secret():
        if request.path.endswith("/health"):
            return None
        expected = Config.SERVICE_SECRET
        if expected and request.headers.get("x-service-secret") != expected:
            return jsonify({"success": False, "error": "Unauthorized service call"}), 403
        return None

    # Register blueprints
    from app.routes import grading_bp
    app.register_blueprint(grading_bp)

    return app

