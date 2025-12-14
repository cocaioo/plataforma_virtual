from fastapi import FastAPI, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db, engine, Base

app = FastAPI()

@app.on_event("startup")
async def startup():
    """Cria as tabelas no banco de dados."""
    # Temporariamente comentado - vamos criar manualmente
    pass
    # async with engine.begin() as conn:
    #     await conn.run_sync(Base.metadata.create_all)

@app.on_event("shutdown")
async def shutdown():
    """Fecha conexões com o banco de dados."""
    await engine.dispose()

@app.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """Testa a conexão com o banco."""
    try:
        await db.execute("SELECT 1")
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return {"status": "error", "database": str(e)}

from routes.auth_routes import auth_router

app.include_router(auth_router)