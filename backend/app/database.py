"""
Database configuration and session management.

This module handles SQLAlchemy setup, database connections,
and provides session dependency injection for FastAPI.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Pobranie URL bazy danych ze zmiennych środowiskowych lub domyślnie lokalna SQLite
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./financial_analyzer.db")

# Konwersja starego formatu postgres:// na postgresql:// wymagany przez SQLAlchemy
# Render.com używa starego formatu URL, trzeba go zmienić
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Argumenty połączenia: dla SQLite wyłączamy sprawdzenie wątku, dla PostgreSQL pusty dict
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

# Silnik bazy danych - tworzy połączenie z bazą
engine = create_engine(DATABASE_URL, connect_args=connect_args)

# Fabryka sesji - używana do tworzenia sesji bazy danych
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Klasa bazowa dla wszystkich modeli SQLAlchemy
Base = declarative_base()


# Funkcja generator do wstrzykiwania sesji bazy danych w endpointach FastAPI
def get_db():
    """
    Provides database session as dependency for FastAPI routes.

    Yields:
        Session: Database session object
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
