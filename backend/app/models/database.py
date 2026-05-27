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
        _run_migrations()
    except Exception as e:
        print(f"Warning: Failed to initialize database tables: {e}")
        print("The application will continue to run, but database operations may fail until the connection is available.")
        # Still attempt migrations even if create_all failed (tables may already exist)
        _run_migrations()

# Only create tables at startup, not on module import
# Base.metadata.create_all(bind=engine)

def _run_migrations():
    """Run any necessary schema migrations for existing tables."""
    if "postgresql" not in DATABASE_URL:
        return  # SQLite managed entirely by create_all

    try:
        from sqlalchemy import text as sa_text
        with engine.connect() as conn:
            # Check if recomendacoes table has the expected columns
            # If it has an old/partial schema, drop and recreate it (it's always empty at this stage)
            try:
                result = conn.execute(sa_text(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_name = 'recomendacoes' AND table_schema = 'public'"
                ))
                existing_cols = {row[0] for row in result}
                expected_cols = {"id", "cluster_id", "data_criacao", "tipo", "descricao",
                                 "status", "resultado", "data_execucao"}
                if existing_cols and not expected_cols.issubset(existing_cols):
                    # Table exists but is missing required columns — safe to recreate
                    print(f"recomendacoes schema mismatch (found: {existing_cols}). Recreating table...")
                    conn.execute(sa_text("DROP TABLE IF EXISTS recomendacoes CASCADE"))
                    conn.commit()
                    # create_all will recreate it on next startup call
                    from app.models.models import Recomendacao
                    Recomendacao.__table__.create(bind=engine, checkfirst=True)
                    print("recomendacoes table recreated with correct schema.")
            except Exception as e:
                print(f"Warning: recomendacoes migration check failed (non-fatal): {e}")
    except Exception as e:
        print(f"Warning: Migration failed (non-fatal): {e}")

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
