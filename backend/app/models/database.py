from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker
from contextlib import contextmanager
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./cpee_dashboard.db")

# Configure engine with appropriate parameters
if "sqlite" in DATABASE_URL:
    engine_kwargs = {
        "connect_args": {"check_same_thread": False}
    }
elif "postgresql" in DATABASE_URL:
    # For Supabase Transaction Pooler: disable SQLAlchemy pooling (pgBouncer handles it)
    engine_kwargs = {
        "pool_pre_ping": True,      # Test connections before use
        "pool_size": 5,             # Small pool for non-serverless deployments
        "max_overflow": 10,
        "pool_timeout": 30,
        "pool_recycle": 300,        # Recycle connections every 5 min
        "echo": False
    }
    # Add SSL requirement for Supabase if not already present
    if "sslmode" not in DATABASE_URL and "?" not in DATABASE_URL:
        DATABASE_URL += "?sslmode=require"
    elif "sslmode" not in DATABASE_URL:
        DATABASE_URL += "&sslmode=require"
else:
    engine_kwargs = {}

engine = create_engine(DATABASE_URL, **engine_kwargs)

# Enable ForeignKey constraints for SQLite
if "sqlite" in DATABASE_URL:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Create all database tables - moved to lazy initialization to avoid blocking on import
def init_db():
    try:
        Base.metadata.create_all(bind=engine)
        print("Database tables initialized successfully")
    except Exception as e:
        print(f"Warning: Failed to initialize database tables: {e}")
        print("The application will continue to run, but database operations may fail until the connection is available.")

# Only create tables at startup, not on module import
# Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@contextmanager
def get_db_context():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
