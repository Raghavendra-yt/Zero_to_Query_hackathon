"""
Library Management System - Fine Routes
=========================================
Blueprint: ``/api/v1/fines``
Endpoints: GET (list), POST (create), POST (pay)
"""

from flask import Blueprint, request

from services.fine_service import get_all_fines, create_fine, pay_fine
from utils import success_response, error_response

fines_bp = Blueprint("fines", __name__)


@fines_bp.route("/api/v1/fines", methods=["GET"])
def get_fines():
    """
    GET /api/v1/fines?status=<Pending|Paid>
    Returns all fine records enriched with student and book info.
    """
    status_filter = request.args.get("status", "").strip()
    fines = get_all_fines(status_filter=status_filter)
    return success_response(fines)


@fines_bp.route("/api/v1/fines", methods=["POST"])
def create_fine_route():
    """
    POST /api/v1/fines
    Body: { student_id, amount, category, notes? }
    Manually issues/applies a fine to a student.
    """
    payload = request.get_json(silent=True) or {}

    data, err, status = create_fine(payload)
    if err:
        return error_response(err, status)
    return success_response(data, status)


@fines_bp.route("/api/v1/fines/<int:fine_id>/pay", methods=["POST"])
def pay_fine_route(fine_id: int):
    """
    POST /api/v1/fines/<fine_id>/pay
    Marks a fine as paid and records the payment date.
    """
    data, err, status = pay_fine(fine_id)
    if err:
        return error_response(err, status)
    return success_response(data)
