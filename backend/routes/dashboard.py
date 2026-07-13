"""
Library Management System - Dashboard Routes
==============================================
Blueprint: ``/api/v1/dashboard``
Endpoints: GET metrics, GET overdue report
"""

from flask import Blueprint

from services.fine_service import get_dashboard_metrics, get_overdue_report
from utils import success_response

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/api/v1/dashboard/metrics", methods=["GET"])
def dashboard_metrics():
    """
    GET /api/v1/dashboard/metrics
    Returns aggregated KPI figures for the dashboard header cards:
      - Total Books Volume
      - Active Book Loans
      - Overdue Returns
      - Total Pending Fines
    """
    metrics = get_dashboard_metrics()
    return success_response(metrics)


@dashboard_bp.route("/api/v1/dashboard/overdue", methods=["GET"])
def dashboard_overdue():
    """
    GET /api/v1/dashboard/overdue
    Returns a joined list of all currently overdue loans enriched with
    student, book, and fine information. Ordered by most overdue first.
    """
    report = get_overdue_report()
    return success_response(report)
