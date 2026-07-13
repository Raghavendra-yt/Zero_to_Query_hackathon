"""
Library Management System - Transaction Service
=================================================
Business logic for book checkout, return, and renewal operations.
"""

from datetime import date, datetime, timedelta
from typing import Any, Optional

from config import DEFAULT_LOAN_DAYS
from models import db, Student, Book, Transaction, Fine
from utils import calculate_fine, generate_transaction_id


# ---------------------------------------------------------------------------
# Query
# ---------------------------------------------------------------------------

def get_all_transactions(status_filter: str = "") -> list[dict]:
    """Return all transactions enriched with student name and book title.

    Args:
        status_filter: Optional 'Active', 'Returned', or 'Lost'.

    Returns:
        List of serialized transaction dictionaries, ordered by issue date (desc).
    """
    query = Transaction.query.join(Book).join(Student)

    if status_filter:
        query = query.filter(Transaction.status == status_filter)

    txns = query.order_by(Transaction.issue_date.desc()).all()

    result = []
    for txn in txns:
        item = txn.to_dict()
        item["student_name"] = f"{txn.student.first_name} {txn.student.last_name}"
        item["registration_number"] = txn.student.registration_number
        item["book_title"] = txn.book.title
        item["fine_amount"] = txn.fine.fine_amount if txn.fine else 0.0
        result.append(item)

    return result


# ---------------------------------------------------------------------------
# Checkout
# ---------------------------------------------------------------------------

def checkout(payload: dict[str, Any]) -> tuple[Optional[dict], Optional[str], int]:
    """Issue a book to a student.

    Creates a new active transaction and decrements available_copies.
    Default loan period is 14 days if due_date is not provided.

    Args:
        payload: JSON body with student_id, book_id, and optional due_date.

    Returns:
        (data_dict, None, 201) on success,
        (None, error_message, status_code) on failure.
    """
    # Validate required fields
    required = ["student_id", "book_id"]
    missing = [f for f in required if not payload.get(f)]
    if missing:
        return None, f"Missing required fields: {', '.join(missing)}", 400

    # Validate student
    student = Student.query.get(payload["student_id"])
    if not student:
        return None, "Student not found.", 404
    if student.status == "Suspended":
        return None, "Student account is suspended. Cannot issue books.", 400

    # Validate book
    book = Book.query.get(payload["book_id"])
    if not book:
        return None, "Book not found.", 404
    if book.available_copies < 1:
        return None, "No copies of this book are currently available.", 400

    # Determine due date
    if payload.get("due_date"):
        try:
            due_date = datetime.strptime(payload["due_date"], "%Y-%m-%d").date()
        except ValueError:
            return None, "Invalid due_date format. Use YYYY-MM-DD.", 400
    else:
        due_date = date.today() + timedelta(days=DEFAULT_LOAN_DAYS)

    # Generate transaction ID
    last_txn = Transaction.query.order_by(Transaction.transaction_id.desc()).first()
    new_tx_id = generate_transaction_id(last_txn)

    # Create transaction
    txn = Transaction(
        transaction_id=new_tx_id,
        book_id=book.book_id,
        student_id=student.student_id,
        issue_date=date.today(),
        due_date=due_date,
        status="Active",
    )
    db.session.add(txn)

    # Decrement available copies
    book.available_copies -= 1

    db.session.commit()

    response_data = txn.to_dict()
    response_data["student_name"] = f"{student.first_name} {student.last_name}"
    response_data["book_title"] = book.title
    response_data["fine_amount"] = 0.0

    return response_data, None, 201


# ---------------------------------------------------------------------------
# Return
# ---------------------------------------------------------------------------

def return_book(transaction_id: str) -> tuple[Optional[dict], Optional[str], int]:
    """Mark a transaction as returned and calculate any overdue fine.

    Increments available_copies and automatically creates/updates
    a fine record if the book is overdue.

    Args:
        transaction_id: The transaction's primary key string.

    Returns:
        (data_dict, None, 200) on success,
        (None, error_message, status_code) on failure.
    """
    txn = Transaction.query.get(transaction_id)
    if not txn:
        return None, "Transaction not found.", 404

    if txn.status == "Returned":
        return None, "This transaction has already been marked as returned.", 409

    return_date = date.today()
    txn.return_date = return_date
    txn.status = "Returned"

    # Restore available copies
    txn.book.available_copies = min(
        txn.book.available_copies + 1,
        txn.book.total_copies,
    )

    # Calculate and persist fine if the book is overdue
    fine_amount = calculate_fine(txn.due_date, return_date)
    days_overdue = max(0, (return_date - txn.due_date).days)

    if fine_amount > 0:
        if txn.fine:
            # Update existing fine record
            txn.fine.fine_amount = fine_amount
            txn.fine.payment_status = "Pending"
        else:
            # Create a new fine record
            new_fine = Fine(
                transaction_id=txn.transaction_id,
                fine_amount=fine_amount,
                payment_status="Pending",
            )
            db.session.add(new_fine)

    db.session.commit()

    return {
        "transaction": txn.to_dict(),
        "student_name": f"{txn.student.first_name} {txn.student.last_name}",
        "book_title": txn.book.title,
        "fine_amount": fine_amount,
        "days_overdue": days_overdue,
        "return_date": str(return_date),
    }, None, 200


# ---------------------------------------------------------------------------
# Renew
# ---------------------------------------------------------------------------

def renew_book(transaction_id: str) -> tuple[Optional[dict], Optional[str], int]:
    """Extend the due_date of an active transaction by 14 days.

    Args:
        transaction_id: The transaction's primary key string.

    Returns:
        (data_dict, None, 200) on success,
        (None, error_message, status_code) on failure.
    """
    txn = Transaction.query.get(transaction_id)
    if not txn:
        return None, "Transaction not found.", 404

    if txn.status != "Active":
        return None, "Can only renew active loans.", 400

    # Extend due date by the default loan period
    txn.due_date = txn.due_date + timedelta(days=DEFAULT_LOAN_DAYS)
    db.session.commit()

    return txn.to_dict(), None, 200
