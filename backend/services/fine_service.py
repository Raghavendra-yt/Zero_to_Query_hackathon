"""
Library Management System - Fine Service
==========================================
Business logic for fine management, payment, and dashboard metrics.
"""

from datetime import date
from typing import Any, Optional

from models import db, Student, Book, Transaction, Fine
from utils import calculate_fine


# ---------------------------------------------------------------------------
# Query
# ---------------------------------------------------------------------------

def get_all_fines(status_filter: str = "") -> list[dict]:
    """Return all fine records enriched with student and book info.

    Args:
        status_filter: Optional 'Pending' or 'Paid'.

    Returns:
        List of serialized fine dictionaries, ordered by fine_id (desc).
    """
    query = Fine.query.join(Transaction).join(Student).join(Book)

    if status_filter:
        query = query.filter(Fine.payment_status == status_filter)

    fines = query.order_by(Fine.fine_id.desc()).all()

    result = []
    for fine in fines:
        item = fine.to_dict()
        item["student_name"] = (
            f"{fine.transaction.student.first_name} "
            f"{fine.transaction.student.last_name}"
        )
        item["student_id"] = fine.transaction.student_id
        item["book_title"] = fine.transaction.book.title
        item["due_date"] = str(fine.transaction.due_date)
        result.append(item)

    return result


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------

def create_fine(payload: dict[str, Any]) -> tuple[Optional[dict], Optional[str], int]:
    """Manually issue/apply a fine to a student.

    Args:
        payload: JSON body with student_id, amount, and optional
                 category, notes, transaction_id.

    Returns:
        (data_dict, None, 201) on success,
        (None, error_message, status_code) on failure.
    """
    student_id = payload.get("student_id")
    amount = payload.get("amount")
    transaction_id = payload.get("transaction_id")

    if not student_id or amount is None:
        return None, "Missing required fields: student_id or amount.", 400

    txn = None
    if transaction_id:
        try:
            if isinstance(transaction_id, str) and transaction_id.upper().startswith("TRX-"):
                tx_id_int = int(transaction_id[4:])
            else:
                tx_id_int = int(transaction_id)
            txn = Transaction.query.filter_by(
                transaction_id=tx_id_int, student_id=student_id
            ).first()
            if not txn:
                return None, f"No transaction found with ID TRX-{tx_id_int:04d} for this student.", 404
        except ValueError:
            return None, "Invalid transaction ID format.", 400
    else:
        # Find latest transaction for this student
        txn = (
            Transaction.query
            .filter_by(student_id=student_id)
            .order_by(Transaction.transaction_id.desc())
            .first()
        )

    if not txn:
        # Create completed placeholder transaction to satisfy NOT NULL unique FK constraint
        book = Book.query.first()
        if not book:
            return None, "No books available in catalog to associate fine.", 400
        txn = Transaction(
            book_id=book.book_id,
            student_id=student_id,
            issue_date=date.today(),
            due_date=date.today(),
            status="Returned",
            return_date=date.today(),
        )
        db.session.add(txn)
        db.session.flush()

    if txn.fine:
        # Update existing fine
        txn.fine.fine_amount += float(amount)
        txn.fine.payment_status = "Pending"
        fine_record = txn.fine
    else:
        # Create new fine
        new_fine = Fine(
            transaction_id=txn.transaction_id,
            fine_amount=float(amount),
            payment_status="Pending",
        )
        db.session.add(new_fine)
        fine_record = new_fine

    db.session.commit()

    # Enrich response
    res = fine_record.to_dict()
    res["student_name"] = f"{txn.student.first_name} {txn.student.last_name}"
    res["student_id"] = txn.student_id
    res["book_title"] = txn.book.title
    res["due_date"] = str(txn.due_date)

    return res, None, 201


# ---------------------------------------------------------------------------
# Pay
# ---------------------------------------------------------------------------

def pay_fine(fine_id: int) -> tuple[Optional[dict], Optional[str], int]:
    """Mark a fine as paid and record the payment date.

    Args:
        fine_id: The integer fine ID.

    Returns:
        (data_dict, None, 200) on success,
        (None, error_message, status_code) on failure.
    """
    fine = Fine.query.get(fine_id)
    if not fine:
        return None, "Fine not found.", 404

    if fine.payment_status == "Paid":
        return None, "This fine has already been paid.", 409

    fine.payment_status = "Paid"
    fine.paid_date = date.today()
    db.session.commit()

    return fine.to_dict(), None, 200


# ---------------------------------------------------------------------------
# Dashboard Metrics
# ---------------------------------------------------------------------------

def get_dashboard_metrics() -> dict:
    """Calculate aggregated KPI figures for the dashboard header cards.

    Returns:
        Dictionary with totalBooks, activeIssues, totalOverdue, totalFines.
    """
    today = date.today()

    total_books = db.session.query(
        db.func.coalesce(db.func.sum(Book.total_copies), 0)
    ).scalar()

    active_loans = Transaction.query.filter_by(status="Active").count()

    overdue_count = Transaction.query.filter(
        Transaction.status == "Active",
        Transaction.due_date < today,
    ).count()

    total_fines = db.session.query(
        db.func.coalesce(db.func.sum(Fine.fine_amount), 0)
    ).filter(Fine.payment_status == "Pending").scalar()

    return {
        "totalBooks": int(total_books),
        "activeIssues": active_loans,
        "totalOverdue": overdue_count,
        "totalFines": round(float(total_fines), 2),
    }


def get_overdue_report() -> list[dict]:
    """Build the overdue loans report for the dashboard.

    Returns:
        List of enriched overdue transaction dictionaries,
        ordered by most overdue first.
    """
    today = date.today()

    overdue_txns = (
        Transaction.query
        .filter(Transaction.status == "Active", Transaction.due_date < today)
        .join(Book, Transaction.book_id == Book.book_id)
        .join(Student, Transaction.student_id == Student.student_id)
        .order_by(Transaction.due_date.asc())
        .all()
    )

    result = []
    for txn in overdue_txns:
        days_overdue = (today - txn.due_date).days
        fine_amount = txn.fine.fine_amount if txn.fine else calculate_fine(txn.due_date)
        s = txn.student
        b = txn.book

        result.append({
            # ── Transaction ──────────────────────────────────────
            "transaction_id": txn.transaction_id,
            "issue_date": str(txn.issue_date),
            "expected_return_date": str(txn.due_date),
            "days_overdue": days_overdue,
            "fine_amount": fine_amount,
            "fine_status": txn.fine.payment_status if txn.fine else "Pending",
            "automated_reminder_sent": 0,
            # ── Student ───────────────────────────────────────────
            "student_id": s.student_id,
            "student_name": f"{s.first_name} {s.last_name}",
            "first_name": s.first_name,
            "last_name": s.last_name,
            "email": s.email,
            "phone": s.phone,
            "department": s.department,
            "class_year": s.class_year,
            "student_status": s.status,
            "registration_number": s.registration_number,
            # ── Book ──────────────────────────────────────────────
            "book_id": b.book_id,
            "title": b.title,
            "author": b.author,
            "isbn": b.isbn,
            "category": b.category,
        })

    return result
