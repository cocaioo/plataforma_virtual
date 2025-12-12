import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Defina a URL do Postgres em DATABASE_URL, ex:
# postgresql+psycopg2://usuario:senha@host:5432/nome_do_banco
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "Configure a variavel de ambiente DATABASE_URL, ex: "
        "postgresql+psycopg2://user:pass@localhost:5432/dbname"
    )

engine = create_engine(DATABASE_URL, future=True, echo=False)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, future=True)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
