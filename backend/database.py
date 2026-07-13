"""
Library Management System - Database Initialization
=====================================================
Handles table creation, schema migrations, and seed data insertion.
Called once during application startup via ``init_database()``.
"""

import os
from datetime import date, timedelta
from sqlalchemy import inspect, text

from models import db, Student, Book, Transaction, Fine, User
from utils import calculate_fine


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def init_database(app, base_dir: str) -> None:
    """Initialize the database: create tables, run migrations, seed data.

    Args:
        app: The Flask application instance.
        base_dir: Absolute path to the ``backend/`` directory (for DB file).
    """
    with app.app_context():
        print("Initialising database...")
        db.create_all()

        # Run safe schema migrations
        _run_migration(base_dir)

        # Populate sample data on first run
        seed_database()

        print("[OK] Database ready.")


# ---------------------------------------------------------------------------
# Migration
# ---------------------------------------------------------------------------

def _run_migration(base_dir: str) -> None:
    """Add missing columns to existing tables (safe, idempotent).

    Currently handles:
        - ``book_image TEXT`` column on the ``books`` table.
        - ``age INTEGER`` and ``registration_number VARCHAR`` on ``students``.
    """
    inspector = inspect(db.engine)
    
    try:
        book_cols = [col["name"] for col in inspector.get_columns("books")]
        if "book_image" not in book_cols:
            db.session.execute(text("ALTER TABLE books ADD COLUMN book_image TEXT"))
            print("  -> Migrated: added book_image column to books table.")

        student_cols = [col["name"] for col in inspector.get_columns("students")]
        if "age" not in student_cols:
            db.session.execute(text("ALTER TABLE students ADD COLUMN age INTEGER"))
            print("  -> Migrated: added age column to students table.")

        if "registration_number" not in student_cols:
            db.session.execute(text("ALTER TABLE students ADD COLUMN registration_number VARCHAR(50)"))
            print("  -> Migrated: added registration_number column to students table.")
            
        db.session.commit()
    except Exception as e:
        print(f"  -> Migration encountered an error (safe to ignore if using existing DB): {e}")


# ---------------------------------------------------------------------------
# Seed Data
# ---------------------------------------------------------------------------

def seed_database() -> None:
    """Populate the database with realistic sample data on first run.

    Inserts 7 students, 10 books, 7 transactions, and fines for the
    first 5 overdue transactions. Skipped entirely if data already exists.
    """
    # Seed default user if none exists
    from werkzeug.security import generate_password_hash
    if not User.query.first():
        print("  -> Seeding default admin user...")
        admin = User(
            name="Library Admin",
            email="admin@library.com",
            password_hash=generate_password_hash("password123")
        )
        db.session.add(admin)
        db.session.commit()

    if Student.query.first():
        return  # Already seeded

    print("  -> Seeding database with sample data...")

    # -----------------------------------------------------------------
    # Students
    # -----------------------------------------------------------------
    students = [
        Student(student_id="ST-8492", first_name="Eleanor", last_name="Vance",     email="evance@uni.edu",    phone="1234567890", status="Active"),
        Student(student_id="ST-9104", first_name="Arthur",  last_name="Hastings",  email="ahastings@uni.edu", phone="0987654321", status="Active"),
        Student(student_id="ST-1102", first_name="Jane",    last_name="Eyre",       email="jeyre@uni.edu",     phone="5551234567", status="Active"),
        Student(student_id="ST-4431", first_name="Holden",  last_name="Caulfield", email="hcaulfield@uni.edu",phone="5559876543", status="Active"),
        Student(student_id="ST-1984", first_name="Winston", last_name="Smith",      email="wsmith@uni.edu",    phone="5558889999", status="Active"),
        Student(student_id="ST-0001", first_name="John",    last_name="Doe",        email="jdoe@uni.edu",      phone="1112223333", status="Active"),
        Student(student_id="ST-0002", first_name="Jane",    last_name="Smith",      email="jsmith@uni.edu",    phone="4445556666", status="Active"),
    ]
    db.session.add_all(students)

    # -----------------------------------------------------------------
    # Books
    # -----------------------------------------------------------------
    books = [
        Book(isbn="978-0465050659", title="The Design of Everyday Things",   author="Don Norman",       total_copies=5, available_copies=4, category="Literature"),
        Book(isbn="978-0132350884", title="Clean Code",                      author="Robert C. Martin", total_copies=3, available_copies=2, category="Computer Science"),
        Book(isbn="978-1999026402", title="Refactoring UI",                  author="Adam Wathan",      total_copies=4, available_copies=4, category="Computer Science"),
        Book(isbn="978-0262033848", title="Introduction to Algorithms",      author="Thomas H. Cormen", total_copies=6, available_copies=5, category="Computer Science"),
        Book(isbn="978-0374533557", title="Thinking, Fast and Slow",         author="Daniel Kahneman",  total_copies=8, available_copies=8, category="Literature"),
        Book(isbn="978-0141187884", title="The Haunting of Hill House",      author="Shirley Jackson",  total_copies=2, available_copies=1, category="Literature"),
        Book(isbn="978-0007120857", title="The Mysterious Affair at Styles", author="Agatha Christie",  total_copies=3, available_copies=2, category="Literature"),
        Book(isbn="978-0415487412", title="Principles of Mathematics",       author="Bertrand Russell", total_copies=1, available_copies=0, category="Mathematics"),
        Book(isbn="978-0316769174", title="The Catcher in the Rye",          author="J.D. Salinger",    total_copies=4, available_copies=3, category="Literature"),
        Book(isbn="978-0451524935", title="1984",                            author="George Orwell",    total_copies=5, available_copies=3, category="Literature"),
    ]
    db.session.add_all(books)
    db.session.flush()  # Flush so book_id values are assigned

    # -----------------------------------------------------------------
    # Transactions (some overdue for dashboard realism)
    # -----------------------------------------------------------------
    overdue_date = date.today() - timedelta(days=40)
    txns = [
        Transaction(transaction_id="TRX-0001", book_id=6, student_id="ST-8492", issue_date=overdue_date,                      due_date=overdue_date + timedelta(days=14), status="Active"),
        Transaction(transaction_id="TRX-0002", book_id=7, student_id="ST-9104", issue_date=overdue_date + timedelta(days=2),  due_date=overdue_date + timedelta(days=16), status="Active"),
        Transaction(transaction_id="TRX-0003", book_id=8, student_id="ST-1102", issue_date=overdue_date - timedelta(days=10), due_date=overdue_date + timedelta(days=4),  status="Active"),
        Transaction(transaction_id="TRX-0004", book_id=9, student_id="ST-4431", issue_date=overdue_date + timedelta(days=4),  due_date=overdue_date + timedelta(days=18), status="Active"),
        Transaction(transaction_id="TRX-0005", book_id=10,student_id="ST-1984", issue_date=overdue_date - timedelta(days=5),  due_date=overdue_date + timedelta(days=9),  status="Active"),
        Transaction(transaction_id="TRX-0006", book_id=2, student_id="ST-0001", issue_date=date.today() - timedelta(days=5),  due_date=date.today() + timedelta(days=9),  status="Active"),
        Transaction(transaction_id="TRX-0007", book_id=4, student_id="ST-0002", issue_date=date.today() - timedelta(days=3),  due_date=date.today() + timedelta(days=11), status="Active"),
    ]
    db.session.add_all(txns)
    db.session.flush()

    # -----------------------------------------------------------------
    # Fines for overdue transactions
    # -----------------------------------------------------------------
    for txn in txns[:5]:
        amount = calculate_fine(txn.due_date)
        if amount > 0:
            db.session.add(Fine(
                transaction_id=txn.transaction_id,
                fine_amount=amount,
                payment_status="Pending",
            ))

    db.session.commit()
    print("  [OK] Seed data inserted successfully.")
