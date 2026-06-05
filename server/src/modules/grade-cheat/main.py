#!/usr/bin/env python3
"""Flask entry point for the exam grading service."""

import logging

from flask import Flask, jsonify

from app import create_app
from app.config import Config

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def create_application() -> Flask:
    app = create_app()

    @app.errorhandler(404)
    def not_found(_error):
        return jsonify({"error": "Not found", "message": "The requested endpoint does not exist"}), 404

    @app.errorhandler(500)
    def internal_error(error):
        logger.error("Internal server error: %s", error)
        return jsonify({"error": "Internal server error", "message": "An unexpected error occurred"}), 500

    @app.route("/", methods=["GET"])
    def root():
        return jsonify({
            "service": "Exam Grading Service",
            "version": "1.0.0",
            "status": "running",
            "endpoints": {
                "start_grading": "POST /api/grade/async?examId=<id>&mode=strict|lenient|medium",
                "progress": "GET /api/grade/progress?taskId=<id>",
                "results": "GET /api/results?examId=<id>",
                "analytics": "GET /api/analytics?examId=<id>",
                "health": "GET /api/health",
            },
        }), 200

    return app


if __name__ == "__main__":
    app = create_application()
    port = Config.FLASK_PORT

    print(f"""
    Exam Grading Service
    Server: http://localhost:{port}
    Health: http://localhost:{port}/api/health
    Env:    {Config.FLASK_ENV}  |  Gemini: {Config.GEMINI_MODEL}
    """)

    app.run(host="0.0.0.0", port=port, debug=Config.DEBUG)
