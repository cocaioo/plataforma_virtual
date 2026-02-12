from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

Base = declarative_base()


def _normalize_database_url(url: str) -> str:
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg://", 1)
    if url.startswith("postgresql://") and "+psycopg" not in url:
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


def _build_database_url_from_parts() -> str | None:
    database_user = os.getenv("DB_USER")
    database_password = os.getenv("DB_PASSWORD")
    database_host = os.getenv("DB_HOST")
    database_port = os.getenv("DB_PORT")
    database_name = os.getenv("DB_NAME")

    if not all([database_user, database_password, database_host, database_port, database_name]):
        return None

    return (
        f"postgresql+psycopg://{database_user}:{database_password}"
        f"@{database_host}:{database_port}/{database_name}"
    )


# Em produção (Render), a DATABASE_URL costuma vir pronta.
# Em dev, aceitamos DB_* (monta URL) e, se nada for informado, caímos para SQLite.
if not DATABASE_URL:
    DATABASE_URL = _build_database_url_from_parts()

if not DATABASE_URL:
    # Fallback para desenvolvimento local sem variáveis de ambiente.
    # Requer o pacote `aiosqlite`.
    DATABASE_URL = "sqlite+aiosqlite:///./dev.db"

DATABASE_URL = _normalize_database_url(DATABASE_URL)

#Criando a engine
#Engine é um objeto do SQLAlchemy usado
#para gerenciar e configurar conexões entre
#o BD e a aplicação
engine_kwargs = {
    "echo": False,
    "future": True,
}

if not DATABASE_URL.startswith("sqlite"):
    engine_kwargs.update({
        "pool_pre_ping": True,
        "pool_size": 5,
        "max_overflow": 10,
        "pool_recycle": 3600,
    })

engine = None
AsyncSessionLocal = None

if os.getenv("SKIP_ASYNC_ENGINE") != "1":
    engine = create_async_engine(DATABASE_URL, **engine_kwargs)

    # Fábrica de sessões
    AsyncSessionLocal = sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
        autocommit=False,
    )


# Função para criar e fornecer sessões para a rota.
async def get_db():
    if AsyncSessionLocal is None:
        raise RuntimeError("Async engine not initialized")
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
