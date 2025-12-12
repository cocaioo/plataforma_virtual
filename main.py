from fastapi import FastAPI

from database import engine
from models.auth_models import base

app = FastAPI()

# Garante que as tabelas existam ao subir a API (para ambiente de desenvolvimento)
base.metadata.create_all(bind=engine)

from routes.auth_routes import auth_router

app.include_router(auth_router)