"""
Library Management System - Book Routes
=========================================
Blueprint: ``/api/v1/books``
Endpoints: GET (list), POST (create), PUT (update), DELETE (remove)
"""

from flask import Blueprint, request

from services.book_service import get_all_books, create_book, update_book, delete_book
from utils import success_response, error_response

books_bp = Blueprint("books", __name__)


@books_bp.route("/api/v1/books", methods=["GET"])
def get_books():
    """
    GET /api/v1/books?search=<query>&category=<category>
    Returns the full book catalog, optionally filtered.
    """
    search = request.args.get("search", "").strip().lower()
    category = request.args.get("category", "").strip()

    books = get_all_books(search=search, category=category)
    return success_response(books)


@books_bp.route("/api/v1/books", methods=["POST"])
def add_book():
    """
    POST /api/v1/books
    Body: { isbn, title, author, total_copies, category, book_image? }
    Registers a new book in the catalog.
    """
    payload = request.get_json(silent=True)
    if not payload:
        return error_response("Request body must be valid JSON.")

    data, err, status = create_book(payload)
    if err:
        return error_response(err, status)
    return success_response(data, status)


@books_bp.route("/api/v1/books/<int:book_id>", methods=["PUT"])
def update_book_route(book_id: int):
    """
    PUT /api/v1/books/<book_id>
    Updates book metadata. Does not modify available_copies directly.
    """
    payload = request.get_json(silent=True) or {}

    data, err, status = update_book(book_id, payload)
    if err:
        return error_response(err, status)
    return success_response(data)


@books_bp.route("/api/v1/books/<int:book_id>", methods=["DELETE"])
def delete_book_route(book_id: int):
    """
    DELETE /api/v1/books/<book_id>
    Removes a book from the catalog (cascades to transactions & fines).
    """
    data, err, status = delete_book(book_id)
    if err:
        return error_response(err, status)
    return success_response(data)
