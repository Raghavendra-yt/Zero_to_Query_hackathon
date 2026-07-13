"""
Library Management System - Utility Functions
===============================================
Pure helper functions with no Flask app or database dependencies.
These are safe to import and call from anywhere in the codebase.
"""

from datetime import date
from typing import Any, Optional

from flask import jsonify

from config import FINE_PER_DAY


# ---------------------------------------------------------------------------
# Response Helpers
# ---------------------------------------------------------------------------

def success_response(data: Any, status_code: int = 200) -> tuple:
    """Wrap data in a standard success envelope.

    Args:
        data: The payload to include under the ``data`` key.
        status_code: HTTP status code (default 200).

    Returns:
        A (Response, status_code) tuple suitable for Flask route handlers.
    """
    return jsonify({"status": "success", "data": data}), status_code


def error_response(message: str, status_code: int = 400) -> tuple:
    """Wrap an error message in a standard error envelope.

    Args:
        message: Human-readable error description.
        status_code: HTTP status code (default 400).

    Returns:
        A (Response, status_code) tuple suitable for Flask route handlers.
    """
    return jsonify({"status": "error", "message": message}), status_code


# ---------------------------------------------------------------------------
# Business Logic (Pure Functions)
# ---------------------------------------------------------------------------

def calculate_fine(due_date: date, return_date: Optional[date] = None) -> float:
    """Calculate fine amount based on days overdue.

    Uses today's date if the book has not yet been returned.

    Args:
        due_date: The date the book was due.
        return_date: The actual return date, or ``None`` for today.

    Returns:
        The fine amount in rupees (₹), rounded to 2 decimal places.
        Returns 0.0 if the book is not overdue.
    """
    check_date = return_date if return_date else date.today()
    if check_date > due_date:
        overdue_days = (check_date - due_date).days
        return round(overdue_days * FINE_PER_DAY, 2)
    return 0.0


def generate_transaction_id(last_transaction) -> str:
    """Generate the next sequential transaction ID (TRX-XXXX format).

    Args:
        last_transaction: The most recent Transaction model instance,
                          or ``None`` if the table is empty.

    Returns:
        A string like ``'TRX-0001'``, ``'TRX-0002'``, etc.
    """
    if last_transaction:
        try:
            last_id_num = int(last_transaction.transaction_id.split("-")[1])
            next_id_num = last_id_num + 1
        except (IndexError, ValueError):
            # Fallback: count-based if ID format is unexpected
            from models import Transaction
            next_id_num = Transaction.query.count() + 1
    else:
        next_id_num = 1
    return f"TRX-{next_id_num:04d}"
