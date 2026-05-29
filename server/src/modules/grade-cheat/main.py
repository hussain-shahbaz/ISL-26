#!/usr/bin/env python3
"""
Exam Grading Service - Main Flask Application

Entry point for the grading API server
"""

import os
import sys
import logging
from dotenv import load_dotenv
from flask import Flask, jsonify

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Add the module to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app


def create_application():
    """Create and configure the Flask application"""
    
    app = create_app()
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            "error": "Not found",
            "message": "The requested endpoint does not exist"
        }), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        logger.error(f"Internal server error: {error}")
        return jsonify({
            "error": "Internal server error",
            "message": "An unexpected error occurred"
        }), 500
    
    # Root endpoint
    @app.route('/', methods=['GET'])
    def root():
        return jsonify({
            "service": "Exam Grading Service",
            "version": "1.0.0",
            "status": "running",
            "endpoints": {
                "sync_endpoints": {
                    "health": "GET /api/health",
                    "grade": "POST /api/grade?examId=<examId>&mode=<mode>&instructions=<custom_instructions>",
                    "results": "GET /api/results?examId=<examId>",
                    "analytics": "GET /api/analytics?examId=<examId>"
                },
                "async_endpoints_with_progress": {
                    "start_grading": "POST /api/grade/async?examId=<examId>&mode=<mode>&instructions=<custom>",
                    "check_progress": "GET /api/grade/progress?taskId=<taskId>",
                    "cleanup_task": "DELETE /api/grade/cleanup?taskId=<taskId>"
                }
            },
            "documentation": {
                "sync": "Use /api/grade for blocking grading (returns immediately when complete)",
                "async": "Use /api/grade/async to start background task, then poll /api/grade/progress for updates"
            },
            "modes": ["strict", "lenient", "medium"]
        }), 200
    
    return app


if __name__ == '__main__':
    from app.config import Config
    
    app = create_application()
    port = Config.FLASK_PORT
    
    print(f"""
    ╔════════════════════════════════════════════════════════════╗
    ║         Exam Grading Service - Starting                    ║
    ║                                                            ║
    ║  Server: http://localhost:{port}                         
    ║  Health: http://localhost:{port}/api/health              
    ║  API:    http://localhost:{port}/                        
    ║                                                            ║
    ║  Mode: {Config.FLASK_ENV}                          
    ║  Debug: {Config.DEBUG}                           
    ║  Gemini: {Config.GEMINI_MODEL}           
    ╚════════════════════════════════════════════════════════════╝
    """)
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=Config.FLASK_ENV == 'development'
    )
