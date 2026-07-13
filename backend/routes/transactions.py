"""
Library Management System - Transaction Routes
================================================
Blueprint: ``/api/v1/transactions``
Endpoints: GET (list), POST checkout, POST return, POST renew
"""

from flask import Blueprint, request

from services.transaction_service import (
    get_all_transactions,
    checkout,
    return_book,
    renew_book,
)
from utils import success_response, error_response

transactions_bp = Blueprint("transactions", __name__)


@transactions_bp.route("/api/v1/transactions", methods=["GET"])
def get_transactions():
    """
    GET /api/v1/transactions?status=<Active|Returned|Lost>
    Returns transactions enriched with student name and book title.
    """
    status_filter = request.args.get("status", "").strip()
    txns = get_all_transactions(status_filter=status_filter)
    return success_response(txns)


@transactions_bp.route("/api/v1/transactions/checkout", methods=["POST"])
def checkout_book():
    """
    POST /api/v1/transactions/checkout
    Body: { student_id, book_id, due_date (YYYY-MM-DD, optional) }
    Creates a new active transaction and decrements available_copies.
    """
    payload = request.get_json(silent=True)
    if not payload:
        return error_response("Request body must be valid JSON.")

    data, err, status = checkout(payload)
    if err:
        return error_response(err, status)
    return success_response(data, status)


@transactions_bp.route("/api/v1/transactions/return/<transaction_id>", methods=["POST"])
def return_book_route(transaction_id: str):
    """
    POST /api/v1/transactions/return/<transaction_id>
    Marks a transaction as 'Returned', increments available_copies,
    and automatically calculates and records any overdue fine.
    """
    data, err, status = return_book(transaction_id)
    if err:
        return error_response(err, status)
    return success_response(data)


@transactions_bp.route("/api/v1/transactions/renew/<transaction_id>", methods=["POST"])
def renew_book_route(transaction_id: str):
    """
    POST /api/v1/transactions/renew/<transaction_id>
    Extends the due_date of an active transaction by 14 days.
    """
    data, err, status = renew_book(transaction_id)
    if err:
        return error_response(err, status)
    return success_response(data)
