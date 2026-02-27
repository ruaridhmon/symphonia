import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

Base = declarative_base()


def get_engine():
    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        # Default to SQLite in the backend directory
        db_path = Path(__file__).parent.parent / "symphonia.db"
        database_url = f"sqlite:///{db_path}"
        print(f"📦 Using SQLite database: {db_path}")

    # Handle SQLite-specific settings
    if database_url.startswith("sqlite"):
        return create_engine(
            database_url,
            connect_args={"check_same_thread": False},  # Required for SQLite + FastAPI
        )

    return create_engine(database_url)


engine = get_engine()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
