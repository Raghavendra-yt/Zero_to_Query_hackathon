"""
Library Management System - Student Service
=============================================
Business logic for student directory operations.
"""

from datetime import date
from typing import Any, Optional

from models import db, Student, Book, Transaction, Fine


# ---------------------------------------------------------------------------
# Query
# ---------------------------------------------------------------------------

def get_all_students(search: str = "") -> list[dict]:
    """Return all students, optionally filtered by search term.

    Args:
        search: Case-insensitive substring match on name, ID, or email.

    Returns:
        List of serialized student dictionaries, ordered by last name.
    """
    query = Student.query

    if search:
        query = query.filter(
            db.or_(
                Student.first_name.ilike(f"%{search}%"),
                Student.last_name.ilike(f"%{search}%"),
                Student.student_id.ilike(f"%{search}%"),
                Student.email.ilike(f"%{search}%"),
                Student.registration_number.ilike(f"%{search}%"),
            )
        )

    students = query.order_by(Student.last_name).all()
    return [s.to_dict() for s in students]


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------

def create_student(payload: dict[str, Any]) -> tuple[Optional[dict], Optional[str], int]:
    """Register a new student.

    Args:
        payload: JSON body with student_id, first_name, last_name, email,
                 and optional phone, department, class_year, status.

    Returns:
        (data_dict, None, 201) on success,
        (None, error_message, status_code) on failure.
    """
    required = ["student_id", "first_name", "last_name", "email"]
    missing = [f for f in required if not payload.get(f)]
    if missing:
        return None, f"Missing required fields: {', '.join(missing)}", 400

    if Student.query.get(payload["student_id"]):
        return None, "Student ID already exists.", 409

    student = Student(
        student_id=payload["student_id"],
        first_name=payload["first_name"],
        last_name=payload["last_name"],
        email=payload["email"],
        phone=payload.get("phone", ""),
        department=payload.get("department", ""),
        class_year=payload.get("class_year", "") or payload.get("class_name", ""),
        age=int(payload["age"]) if payload.get("age") is not None and str(payload["age"]).strip() != "" else None,
        status=payload.get("status", "Active"),
        registration_number=payload.get("registration_number", ""),
    )
    db.session.add(student)
    db.session.commit()
    return student.to_dict(), None, 201


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------

def update_student(student_id: str, payload: dict[str, Any]) -> tuple[Optional[dict], Optional[str], int]:
    """Update an existing student's information.

    Args:
        student_id: The student's primary key string.
        payload: JSON body with any updatable fields.

    Returns:
        (data_dict, None, 200) on success,
        (None, error_message, status_code) on failure.
    """
    student = Student.query.get(student_id)
    if not student:
        return None, "Student not found.", 404

    if "first_name" in payload:
        student.first_name = payload["first_name"]
    if "last_name" in payload:
        student.last_name = payload["last_name"]
    if "email" in payload:
        email = payload["email"]
        if email != student.email:
            existing = Student.query.filter_by(email=email).first()
            if existing:
                return None, "A student with this email already exists.", 409
        student.email = email
    if "phone" in payload:
        student.phone = payload["phone"]
    if "department" in payload:
        student.department = payload["department"]
    if "class_year" in payload:
        student.class_year = payload["class_year"]
    if "class_name" in payload:
        student.class_year = payload["class_name"]
    if "age" in payload:
        student.age = int(payload["age"]) if payload["age"] is not None and str(payload["age"]).strip() != "" else None
    if "status" in payload:
        student.status = payload["status"]
    if "registration_number" in payload:
        student.registration_number = payload["registration_number"]

    db.session.commit()
    return student.to_dict(), None, 200


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------

def delete_student(student_id: str) -> tuple[Optional[dict], Optional[str], int]:
    """Remove a student record (cascades to transactions & fines).

    Args:
        student_id: The student's primary key string.

    Returns:
        (data_dict, None, 200) on success,
        (None, error_message, status_code) on failure.
    """
    student = Student.query.get(student_id)
    if not student:
        return None, "Student not found.", 404

    db.session.delete(student)
    db.session.commit()
    return {"deleted_student_id": student_id}, None, 200


# ---------------------------------------------------------------------------
# Student-specific queries
# ---------------------------------------------------------------------------

def get_student_transactions(student_id: str) -> tuple[Optional[list], Optional[str], int]:
    """Return all transactions for a student, enriched with book info.

    Args:
        student_id: The student's primary key string.

    Returns:
        (data_list, None, 200) on success,
        (None, error_message, 404) if student not found.
    """
    student = Student.query.get(student_id)
    if not student:
        return None, "Student not found.", 404

    txns = (
        Transaction.query
        .filter_by(student_id=student_id)
        .join(Book, Transaction.book_id == Book.book_id)
        .order_by(Transaction.issue_date.desc())
        .all()
    )
    today = date.today()
    result = []
    for txn in txns:
        item = txn.to_dict()
        item["book_title"] = txn.book.title
        item["book_author"] = txn.book.author
        item["student_name"] = f"{student.first_name} {student.last_name}"
        item["registration_number"] = student.registration_number
        item["fine_amount"] = txn.fine.fine_amount if txn.fine else 0.0
        item["fine_id"] = txn.fine.fine_id if txn.fine else None
        item["fine_status"] = txn.fine.payment_status if txn.fine else None
        item["is_overdue"] = (txn.status == "Active" and txn.due_date < today)
        item["days_overdue"] = (
            (today - txn.due_date).days if item["is_overdue"] else 0
        )
        result.append(item)
    return result, None, 200


def get_student_fines(student_id: str, status_filter: str = "") -> tuple[Optional[list], Optional[str], int]:
    """Return all fine records for a student.

    Args:
        student_id: The student's primary key string.
        status_filter: Optional 'Pending' or 'Paid' to narrow results.

    Returns:
        (data_list, None, 200) on success,
        (None, error_message, 404) if student not found.
    """
    student = Student.query.get(student_id)
    if not student:
        return None, "Student not found.", 404

    query = (
        Fine.query
        .join(Transaction, Fine.transaction_id == Transaction.transaction_id)
        .filter(Transaction.student_id == student_id)
    )
    if status_filter:
        query = query.filter(Fine.payment_status == status_filter)

    fines = query.order_by(Fine.fine_id.desc()).all()
    result = []
    for fine in fines:
        item = fine.to_dict()
        item["book_title"] = fine.transaction.book.title
        item["due_date"] = str(fine.transaction.due_date)
        result.append(item)
    return result, None, 200


def get_student_stats(student_id: str) -> tuple[Optional[dict], Optional[str], int]:
    """Return aggregate statistics for a student.

    Args:
        student_id: The student's primary key string.

    Returns:
        (stats_dict, None, 200) on success,
        (None, error_message, 404) if student not found.
    """
    student = Student.query.get(student_id)
    if not student:
        return None, "Student not found.", 404

    today = date.today()
    all_txns = Transaction.query.filter_by(student_id=student_id).all()
    total_checked_out = len(all_txns)
    active_loans = sum(1 for t in all_txns if t.status == "Active")
    overdue_count = sum(1 for t in all_txns if t.status == "Active" and t.due_date < today)
    late_returns = sum(
        1 for t in all_txns
        if t.status == "Returned" and t.return_date and t.return_date > t.due_date
    )

    paid_fines = db.session.query(
        db.func.coalesce(db.func.sum(Fine.fine_amount), 0)
    ).join(Transaction).filter(
        Transaction.student_id == student_id,
        Fine.payment_status == "Paid"
    ).scalar()

    pending_fines = db.session.query(
        db.func.coalesce(db.func.sum(Fine.fine_amount), 0)
    ).join(Transaction).filter(
        Transaction.student_id == student_id,
        Fine.payment_status == "Pending"
    ).scalar()

    return {
        "total_checked_out": total_checked_out,
        "active_loans": active_loans,
        "overdue_count": overdue_count,
        "late_returns": late_returns,
        "total_fines_paid": round(float(paid_fines), 2),
        "total_fines_pending": round(float(pending_fines), 2),
    }, None, 200
