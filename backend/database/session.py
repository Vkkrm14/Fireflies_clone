from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATABASE_URL = os.getenv("DATABASE_URL") or f"sqlite:///{os.path.join(BASE_DIR, 'fireflies.db')}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False,
)


@event.listens_for(engine, "connect")
def _enable_foreign_keys(dbapi_connection, _record):
    """SQLite ignores foreign keys unless asked; without this ON DELETE CASCADE never fires."""
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency to get a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables."""
    from models import user, meeting, transcript, summary, action_item, tag, comment, soundbite  # noqa: F401
    for table in Base.metadata.tables.values():
        if len(table.primary_key.columns) == 1:
            # AUTOINCREMENT: ids of deleted rows are never reused, so stale references cannot re-attach
            table.dialect_options["sqlite"]["autoincrement"] = True
    Base.metadata.create_all(bind=engine)
