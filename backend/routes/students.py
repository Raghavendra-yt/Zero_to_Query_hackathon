"""
Library Management System - Student Routes
============================================
Blueprint: ``/api/v1/students``
Endpoints: CRUD + transactions, fines, and stats sub-resources
"""

from flask import Blueprint, request

from services.student_service import (
    get_all_students,
    create_student,
    update_student,
    delete_student,
    get_student_transactions,
    get_student_fines,
    get_student_stats,
)
from utils import success_response, error_response

students_bp = Blueprint("students", __name__)


@students_bp.route("/api/v1/students", methods=["GET"])
def get_students():
    """
    GET /api/v1/students?search=<query>
    Returns the full student directory, optionally filtered.
    """
    search = request.args.get("search", "").strip().lower()
    students = get_all_students(search=search)
    return success_response(students)


@students_bp.route("/api/v1/students", methods=["POST"])
def add_student():
    """
    POST /api/v1/students
    Body: { student_id, first_name, last_name, email, phone?, department?, class_year?, status? }
    """
    payload = request.get_json(silent=True)
    if not payload:
        return error_response("Request body must be valid JSON.")

    data, err, status = create_student(payload)
    if err:
        return error_response(err, status)
    return success_response(data, status)


@students_bp.route("/api/v1/students/<student_id>", methods=["PUT"])
def update_student_route(student_id: str):
    """
    PUT /api/v1/students/<student_id>
    Updates a student record.
    """
    payload = request.get_json(silent=True) or {}

    data, err, status = update_student(student_id, payload)
    if err:
        return error_response(err, status)
    return success_response(data)


@students_bp.route("/api/v1/students/<student_id>", methods=["DELETE"])
def delete_student_route(student_id: str):
    """
    DELETE /api/v1/students/<student_id>
    Removes a student record (cascades to transactions & fines).
    """
    data, err, status = delete_student(student_id)
    if err:
        return error_response(err, status)
    return success_response(data)


@students_bp.route("/api/v1/students/<student_id>/transactions", methods=["GET"])
def student_transactions(student_id: str):
    """
    GET /api/v1/students/<student_id>/transactions
    Returns all transactions for a specific student, enriched with book info.
    """
    data, err, status = get_student_transactions(student_id)
    if err:
        return error_response(err, status)
    return success_response(data)


@students_bp.route("/api/v1/students/<student_id>/fines", methods=["GET"])
def student_fines(student_id: str):
    """
    GET /api/v1/students/<student_id>/fines?status=Pending|Paid
    Returns all fine records for a specific student.
    """
    status_filter = request.args.get("status", "").strip()

    data, err, status = get_student_fines(student_id, status_filter=status_filter)
    if err:
        return error_response(err, status)
    return success_response(data)


@students_bp.route("/api/v1/students/<student_id>/stats", methods=["GET"])
def student_stats(student_id: str):
    """
    GET /api/v1/students/<student_id>/stats
    Returns aggregate statistics for a specific student.
    """
    data, err, status = get_student_stats(student_id)
    if err:
        return error_response(err, status)
    return success_response(data)
