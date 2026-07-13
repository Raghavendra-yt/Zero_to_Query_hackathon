"""
Library Management System - SQLAlchemy Models
==============================================
Defines all ORM models: Student, Book, Transaction, Fine.
The ``db`` instance is created **unbound** — call ``db.init_app(app)``
from the application factory before using it.
"""

from flask_sqlalchemy import SQLAlchemy

# Unbound SQLAlchemy instance — initialized with app in app.py
db = SQLAlchemy()


# ---------------------------------------------------------------------------
# Student
# ---------------------------------------------------------------------------

class Student(db.Model):
    """
    Represents a library member (student).

    Primary key: student_id (user-defined string like 'ST-1234').
    Status values: 'Active' | 'Graduated' | 'Suspended'
    """
    __tablename__ = "students"

    student_id:  str = db.Column(db.String(20), primary_key=True)
    first_name:  str = db.Column(db.String(80), nullable=False)
    last_name:   str = db.Column(db.String(80), nullable=False)
    email:       str = db.Column(db.String(120), unique=True, nullable=False)
    phone:       str = db.Column(db.String(20))
    department:  str = db.Column(db.String(100))
    class_year:  str = db.Column(db.String(20))
    age:         int = db.Column(db.Integer)
    status:      str = db.Column(
        db.String(20), nullable=False, default="Active"
    )  # 'Active' | 'Graduated' | 'Suspended'
    registration_number: str = db.Column(db.String(50), nullable=True)

    # Relationship: a student can have many transactions
    transactions = db.relationship(
        "Transaction",
        backref="student",
        cascade="all, delete-orphan",
        lazy=True,
    )

    def to_dict(self) -> dict:
        """Serialize student to a JSON-safe dictionary."""
        return {
            "student_id":  self.student_id,
            "first_name":  self.first_name,
            "last_name":   self.last_name,
            "full_name":   f"{self.first_name} {self.last_name}",
            "email":       self.email,
            "phone":       self.phone,
            "department":  self.department,
            "class_year":  self.class_year,
            "age":         self.age,
            "status":      self.status,
            "registration_number": self.registration_number,
        }


# ---------------------------------------------------------------------------
# Book
# ---------------------------------------------------------------------------

class Book(db.Model):
    """
    Represents a book title in the library catalog.

    ``available_copies`` tracks real-time availability.
    ``book_image`` stores a URL or base64 data URI for the cover image.
    """
    __tablename__ = "books"

    book_id:          int = db.Column(db.Integer, primary_key=True, autoincrement=True)
    isbn:             str = db.Column(db.String(20), unique=True, nullable=False)
    title:            str = db.Column(db.String(200), nullable=False)
    author:           str = db.Column(db.String(120), nullable=False)
    total_copies:     int = db.Column(db.Integer, nullable=False, default=1)
    available_copies: int = db.Column(db.Integer, nullable=False, default=1)
    category:         str = db.Column(db.String(80))
    book_image:       str = db.Column(db.Text, nullable=True)  # cover URL or base64 data URI

    # Relationship: a book can appear in many transactions
    transactions = db.relationship(
        "Transaction",
        backref="book",
        cascade="all, delete-orphan",
        lazy=True,
    )

    def to_dict(self) -> dict:
        """Serialize book to a JSON-safe dictionary."""
        return {
            "book_id":          self.book_id,
            "isbn":             self.isbn,
            "title":            self.title,
            "author":           self.author,
            "total_copies":     self.total_copies,
            "available_copies": self.available_copies,
            "category":         self.category,
            "book_image":       self.book_image,
        }


# ---------------------------------------------------------------------------
# Transaction
# ---------------------------------------------------------------------------

class Transaction(db.Model):
    """
    Represents a book loan event (issue → return lifecycle).

    Status values: 'Active' | 'Returned' | 'Lost'
    """
    __tablename__ = "transactions"

    transaction_id: str = db.Column(db.String(20), primary_key=True)
    book_id:        int = db.Column(db.Integer, db.ForeignKey("books.book_id"), nullable=False)
    student_id:     str = db.Column(db.String(20), db.ForeignKey("students.student_id"), nullable=False)
    issue_date          = db.Column(db.Date, nullable=False, default=__import__("datetime").date.today)
    due_date            = db.Column(db.Date, nullable=False)
    return_date         = db.Column(db.Date, nullable=True)
    status:         str = db.Column(db.String(20), nullable=False, default="Active")
    # 'Active' | 'Returned' | 'Lost'

    # Relationship: a transaction can have at most one fine record
    fine = db.relationship(
        "Fine",
        backref="transaction",
        cascade="all, delete-orphan",
        uselist=False,
        lazy=True,
    )

    def to_dict(self) -> dict:
        """Serialize transaction to a JSON-safe dictionary."""
        return {
            "transaction_id": self.transaction_id,
            "book_id":        self.book_id,
            "student_id":     self.student_id,
            "issue_date":     str(self.issue_date),
            "due_date":       str(self.due_date),
            "return_date":    str(self.return_date) if self.return_date else None,
            "status":         self.status,
        }


# ---------------------------------------------------------------------------
# Fine
# ---------------------------------------------------------------------------

class Fine(db.Model):
    """
    Tracks fines generated from overdue or lost book transactions.

    Payment status values: 'Pending' | 'Paid'
    """
    __tablename__ = "fines"

    fine_id:        int = db.Column(db.Integer, primary_key=True, autoincrement=True)
    transaction_id: str = db.Column(
        db.String(20), db.ForeignKey("transactions.transaction_id"),
        nullable=False, unique=True,
    )
    fine_amount:    float = db.Column(db.Float, nullable=False, default=0.0)
    payment_status: str   = db.Column(db.String(20), nullable=False, default="Pending")
    # 'Pending' | 'Paid'
    paid_date               = db.Column(db.Date, nullable=True)

    def to_dict(self) -> dict:
        """Serialize fine to a JSON-safe dictionary."""
        return {
            "fine_id":        self.fine_id,
            "transaction_id": self.transaction_id,
            "fine_amount":    self.fine_amount,
            "payment_status": self.payment_status,
            "paid_date":      str(self.paid_date) if self.paid_date else None,
        }


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------

class User(db.Model):
    """
    Represents a system user (admin/librarian).
    """
    __tablename__ = "users"

    id: int = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name: str = db.Column(db.String(100), nullable=False)
    email: str = db.Column(db.String(120), unique=True, nullable=False)
    password_hash: str = db.Column(db.String(255), nullable=False)

    def to_dict(self) -> dict:
        """Serialize user to a JSON-safe dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
        }

