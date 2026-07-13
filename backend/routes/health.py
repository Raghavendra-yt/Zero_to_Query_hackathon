"""
Library Management System - Health Check Route
================================================
Blueprint: ``/api/v1/health``
Endpoint: GET liveness probe
"""

from datetime import datetime

from flask import Blueprint

from utils import success_response

health_bp = Blueprint("health", __name__)


@health_bp.route("/api/v1/health", methods=["GET"])
def health_check():
    """Simple liveness probe."""
    return success_response({
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
    })
