"""
Library Management System - Book Service
==========================================
Business logic for book catalog operations.
All functions operate within an active Flask application context.
"""

from typing import Any, Optional

from models import db, Book


# ---------------------------------------------------------------------------
# Query
# ---------------------------------------------------------------------------

def get_all_books(search: str = "", category: str = "") -> list[dict]:
    """Return all books, optionally filtered by search term and/or category.

    Args:
        search: Case-insensitive substring match on title, author, or ISBN.
        category: Exact match on category name.

    Returns:
        List of serialized book dictionaries, ordered by title.
    """
    query = Book.query

    if search:
        query = query.filter(
            db.or_(
                Book.title.ilike(f"%{search}%"),
                Book.author.ilike(f"%{search}%"),
                Book.isbn.ilike(f"%{search}%"),
            )
        )
    if category:
        query = query.filter(Book.category == category)

    books = query.order_by(Book.title).all()
    return [b.to_dict() for b in books]


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------

def create_book(payload: dict[str, Any]) -> tuple[Optional[dict], Optional[str], int]:
    """Add a new book to the catalog.

    Args:
        payload: Validated JSON body with isbn, title, author, total_copies,
                 and optional category and book_image.

    Returns:
        (data_dict, None, 201) on success,
        (None, error_message, status_code) on failure.
    """
    # Validate required fields
    required = ["isbn", "title", "author", "total_copies"]
    missing = [f for f in required if not payload.get(f)]
    if missing:
        return None, f"Missing required fields: {', '.join(missing)}", 400

    # Check ISBN uniqueness
    if Book.query.filter_by(isbn=payload["isbn"]).first():
        return None, "A book with this ISBN already exists.", 409

    copies = int(payload["total_copies"])
    book = Book(
        isbn=payload["isbn"],
        title=payload["title"],
        author=payload["author"],
        total_copies=copies,
        available_copies=copies,
        category=payload.get("category", "General"),
        book_image=payload.get("book_image"),
    )
    db.session.add(book)
    db.session.commit()
    return book.to_dict(), None, 201


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------

def update_book(book_id: int, payload: dict[str, Any]) -> tuple[Optional[dict], Optional[str], int]:
    """Update an existing book's metadata.

    Args:
        book_id: The integer book ID.
        payload: JSON body with any updatable fields.

    Returns:
        (data_dict, None, 200) on success,
        (None, error_message, status_code) on failure.
    """
    book = Book.query.get(book_id)
    if not book:
        return None, "Book not found.", 404

    for field in ["isbn", "title", "author", "category", "book_image"]:
        if field in payload:
            setattr(book, field, payload[field])

    if "total_copies" in payload:
        delta = int(payload["total_copies"]) - book.total_copies
        book.total_copies = int(payload["total_copies"])
        book.available_copies = max(0, book.available_copies + delta)

    db.session.commit()
    return book.to_dict(), None, 200


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------

def delete_book(book_id: int) -> tuple[Optional[dict], Optional[str], int]:
    """Remove a book from the catalog (cascades to transactions & fines).

    Args:
        book_id: The integer book ID.

    Returns:
        (data_dict, None, 200) on success,
        (None, error_message, status_code) on failure.
    """
    book = Book.query.get(book_id)
    if not book:
        return None, "Book not found.", 404

    db.session.delete(book)
    db.session.commit()
    return {"deleted_book_id": book_id}, None, 200
