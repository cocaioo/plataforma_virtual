from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_USER = os.getenv("DB_USER")
DATABASE_PASSWORD = os.getenv("DB_PASSWORD")
DATABASE_HOST = os.getenv("DB_HOST")
DATABASE_PORT = os.getenv("DB_PORT")
DATABASE_NAME = os.getenv("DB_NAME")

DATABASE_URL = f"postgresql+psycopg://{DATABASE_USER}:{DATABASE_PASSWORD}@{DATABASE_HOST}:{DATABASE_PORT}/{DATABASE_NAME}"

#Criando a engine
#Engine é um objeto do SQLAlchemy usado
#para gerenciar e configurar conexões entre
#o BD e a aplicação
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    future=True,
    pool_pre_ping=True, #"pré-ping" antes de entregar a conexão
    pool_size=5, #estoque de conexões
    max_overflow=10, #limite de conexões extras
    pool_recycle=3600, #timer para reabrir conexões
)

#Fábrica de sessõe
AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)

Base = declarative_base()

#Função parar criar e fornecer sessões para a rota.
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
