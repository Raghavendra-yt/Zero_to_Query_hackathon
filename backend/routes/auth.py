"""
Library Management System - Auth Routes
=========================================
Blueprint: ``/api/v1/auth``
Endpoints:
  - POST /api/v1/auth/register (create user)
  - POST /api/v1/auth/login (authenticate user)
  - GET /api/v1/auth/me (current user profile)
"""

from typing import Optional
from flask import Blueprint, request, current_app
from itsdangerous import URLSafeTimedSerializer
from werkzeug.security import generate_password_hash, check_password_hash

from models import db, User
from utils import success_response, error_response

auth_bp = Blueprint("auth", __name__)


def get_serializer():
    secret = current_app.config.get("SECRET_KEY", "secure-library-secret-key-998877")
    return URLSafeTimedSerializer(secret)


def generate_auth_token(user_id: int) -> str:
    """Generate a timed secure authentication token for a user ID."""
    serializer = get_serializer()
    return serializer.dumps({"user_id": user_id}, salt="auth-token")


def verify_auth_token(token: str) -> Optional[int]:
    """Verify the authentication token and return user_id if valid."""
    serializer = get_serializer()
    try:
        # Token is valid for 24 hours (86400 seconds)
        data = serializer.loads(token, salt="auth-token", max_age=86400)
        return data.get("user_id")
    except Exception:
        return None


@auth_bp.route("/api/v1/auth/register", methods=["POST"])
def register():
    """Register a new admin/librarian user."""
    payload = request.get_json(silent=True)
    if not payload:
        return error_response("Request body must be valid JSON.")
    
    name = payload.get("name", "").strip()
    email = payload.get("email", "").strip().lower()
    password = payload.get("password", "")

    if not name or not email or not password:
        return error_response("Name, email, and password are required.")
    
    if len(password) < 6:
        return error_response("Password must be at least 6 characters.")

    if User.query.filter_by(email=email).first():
        return error_response("Email address is already registered.")

    try:
        user = User(
            name=name,
            email=email,
            password_hash=generate_password_hash(password)
        )
        db.session.add(user)
        db.session.commit()
        
        token = generate_auth_token(user.id)
        return success_response({
            "user": user.to_dict(),
            "token": token
        }, 201)
    except Exception as e:
        db.session.rollback()
        return error_response(f"Registration failed: {str(e)}")


@auth_bp.route("/api/v1/auth/login", methods=["POST"])
def login():
    """Login an existing user and return a token."""
    payload = request.get_json(silent=True)
    if not payload:
        return error_response("Request body must be valid JSON.")
    
    email = payload.get("email", "").strip().lower()
    password = payload.get("password", "")

    if not email or not password:
        return error_response("Email and password are required.")

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return error_response("Invalid email or password.", 401)

    token = generate_auth_token(user.id)
    return success_response({
        "user": user.to_dict(),
        "token": token
    })


@auth_bp.route("/api/v1/auth/me", methods=["GET"])
def me():
    """Get the profile details of the currently logged-in user."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return error_response("Authentication token missing or invalid.", 401)
    
    token = auth_header.split(" ")[1]
    user_id = verify_auth_token(token)
    if not user_id:
        return error_response("Authentication token expired or invalid.", 401)
        
    user = User.query.get(user_id)
    if not user:
        return error_response("User not found.", 401)
        
    return success_response({
        "user": user.to_dict()
    })
