"""
Routes package for the Library Management System.
Provides ``register_routes()`` to register all blueprints with the app.
"""

from flask import Flask


def register_routes(app: Flask) -> None:
    """Register all route blueprints with the Flask application.

    Args:
        app: The Flask application instance.
    """
    from .books import books_bp
    from .students import students_bp
    from .transactions import transactions_bp
    from .fines import fines_bp
    from .dashboard import dashboard_bp
    from .health import health_bp
    from .auth import auth_bp

    for bp in [books_bp, students_bp, transactions_bp,
               fines_bp, dashboard_bp, health_bp, auth_bp]:
        app.register_blueprint(bp)
