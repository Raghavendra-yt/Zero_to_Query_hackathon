"""
Library Management System - Configuration
==========================================
Centralizes all application settings, database paths, and business constants.
All magic numbers and environment-specific paths live here.
"""

import os
from typing import Final


# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

BASE_DIR: Final[str] = os.path.abspath(os.path.dirname(__file__))
DIST_DIR: Final[str] = os.path.abspath(os.path.join(BASE_DIR, "..", "dist"))


# ---------------------------------------------------------------------------
# Flask Configuration Class
# ---------------------------------------------------------------------------

class Config:
    """Flask application configuration."""

    _raw_db_uri: str = os.environ.get("DATABASE_URL", "")
    if _raw_db_uri.startswith("postgres://"):
        _raw_db_uri = _raw_db_uri.replace("postgres://", "postgresql://", 1)
    elif not _raw_db_uri:
        _raw_db_uri = f"sqlite:///{os.path.join(BASE_DIR, 'library.db')}"

    SQLALCHEMY_DATABASE_URI: str = _raw_db_uri
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False
    SECRET_KEY: str = os.environ.get("SECRET_KEY", "secure-library-secret-key-998877")

    # Static files (built React frontend)
    STATIC_FOLDER: str = DIST_DIR
    STATIC_URL_PATH: str = "/"


# ---------------------------------------------------------------------------
# Business Constants
# ---------------------------------------------------------------------------

FINE_PER_DAY: Final[float] = 10.0       # ₹10 fine charged per overdue day
DEFAULT_LOAN_DAYS: Final[int] = 14      # Default loan period in days


# ---------------------------------------------------------------------------
# Singleton accessor
# ---------------------------------------------------------------------------

_config_instance: Config | None = None


def get_config() -> Config:
    """Return a singleton Config instance."""
    global _config_instance
    if _config_instance is None:
        _config_instance = Config()
    return _config_instance
