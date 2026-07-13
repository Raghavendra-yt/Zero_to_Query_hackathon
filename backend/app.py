"""
Library Management System - Flask REST API Backend
===================================================
Application factory & entry point.

This module creates the Flask app, initializes extensions, registers
all route blueprints, and sets up the database. The monolithic logic
has been decomposed into:

  - config.py      → Configuration & constants
  - models.py      → SQLAlchemy ORM models
  - utils.py       → Pure helper functions
  - database.py    → DB initialization, migration & seeding
  - routes/        → Blueprint-based route handlers
  - services/      → Business logic layer

Run:  python app.py
"""

import os

# pyrefly: ignore [missing-import]
from flask import Flask, request
from flask_cors import CORS

from config import Config, BASE_DIR
from models import db
from database import init_database
from routes import register_routes


# ---------------------------------------------------------------------------
# Application Factory
# ---------------------------------------------------------------------------

def create_app() -> Flask:
    """Create and configure the Flask application.

    Returns:
        A fully configured Flask application instance with all
        extensions initialized, blueprints registered, and database ready.
    """
    app = Flask(
        __name__,
        static_folder=Config.STATIC_FOLDER,
        static_url_path=Config.STATIC_URL_PATH,
    )
    app.config.from_object(Config)

    # ── Database Connection Verification & Fallback ───────────────────────
    uri = app.config.get("SQLALCHEMY_DATABASE_URI", "")
    if uri.startswith("mysql"):
        import socket
        from urllib.parse import urlparse
        try:
            # Parse host and port
            parsed = urlparse(uri.replace("mysql+pymysql", "http"))
            host = parsed.hostname or "localhost"
            port = parsed.port or 3306
            # Quick connection test with a short timeout
            with socket.create_connection((host, port), timeout=1.0):
                pass
        except (socket.error, Exception) as e:
            print("\n" + "="*80)
            print(f"[WARNING] MySQL database server at {host}:{port} is not reachable.")
            print(f"          Reason: {e}")
            print("          Falling back to local SQLite database ('sqlite:///library.db')")
            print("          to ensure the application starts and runs without errors.")
            print("="*80 + "\n")
            sqlite_path = os.path.join(BASE_DIR, "library.db")
            app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{sqlite_path}"

    # ── Extensions ────────────────────────────────────────────────────────
    db.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # ── Global API Authentication Check ────────────────────────────────────
    @app.before_request
    def check_api_authentication():
        # Exempt health check and authentication endpoints
        path = request.path
        if not path.startswith("/api/"):
            return None  # Serves static files / frontend app
        
        if path == "/api/v1/health" or path.startswith("/api/v1/auth/"):
            return None
            
        # OPTIONS request is sent by browsers for CORS pre-flight, allow it
        if request.method == "OPTIONS":
            return None

        # Check Authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            from utils import error_response
            response, status = error_response("Authentication token is missing or invalid.", 401)
            return response, status
        
        token = auth_header.split(" ")[1]
        from routes.auth import verify_auth_token
        user_id = verify_auth_token(token)
        if not user_id:
            from utils import error_response
            response, status = error_response("Authentication token is expired or invalid.", 401)
            return response, status
            
        # Attach user to request context (flask.g) for easy access
        from flask import g
        from models import User
        user = User.query.get(user_id)
        if not user:
            from utils import error_response
            response, status = error_response("User not found.", 401)
            return response, status
            
        g.current_user = user
        return None

    # ── Route Blueprints ──────────────────────────────────────────────────
    register_routes(app)

    # ── Database (create tables, migrate, seed) ───────────────────────────
    init_database(app, BASE_DIR)

    # ── SPA Catch-All Route ───────────────────────────────────────────────
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_frontend(path):
        """Serve the React frontend for any non-API route."""
        if path != "" and os.path.exists(
            os.path.join(app.static_folder, path)
        ):
            return app.send_static_file(path)
        else:
            return app.send_static_file("index.html")

    return app


# ---------------------------------------------------------------------------
# Entry Point
# ---------------------------------------------------------------------------

app = create_app()

if __name__ == "__main__":
    print("\n[*] Library Management API running at http://127.0.0.1:5000")
    print("   CORS enabled for all origins on /api/* routes.\n")
    app.run(debug=True, host="0.0.0.0", port=5000)
