from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from contextlib import asynccontextmanager
from database import get_db, engine, Base
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging
import sys
import asyncio
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)

@asynccontextmanager
async def lifespan(app: FastAPI):
    #Startup
    logger.info("Inicializando aplicação")
    yield
    
    #Shutdown
    try:
        logger.info("Encerrando engine do banco de dados...")
        await engine.dispose()
        logger.info("Engine do banco de dados encerrada")
    except Exception as e:
        logger.error(f"Erro ao encerrar engine do banco de dados: {e}")

app = FastAPI(lifespan=lifespan) #Inicializa a aplicação do FastAPI
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

#Permite o front-end chamar a API do backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "https://plataforma-virtual.onrender.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routes.auth_routes import auth_router
from routes.diagnostico_routes import diagnostico_router

#Incluindo no Router as rotas de autenticação e diagnóstico
app.include_router(auth_router)
app.include_router(diagnostico_router)

# Monta o diretório de assets estáticos do frontend
app.mount("/assets", StaticFiles(directory="frontend-react/dist/assets"), name="assets")

# Rota para verificar SAÚDE da API (verificar se o banco está conectado e a API rodando)
@app.get("/health") #Rate limite de 10 requisições por minuto
@limiter.limit("10/minute")
async def health_check(request: Request, db: AsyncSession = Depends(get_db)):
    try:
        await db.execute("SELECT 1") #Ping no banco
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return {"status": "error", "database": str(e)}

# Rota catch-all para servir o index.html do React para qualquer outra rota
@app.get("/{catchall:path}", response_class=FileResponse)
async def serve_react_app(catchall: str):
    return "frontend-react/dist/index.html"
