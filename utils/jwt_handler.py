from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    dados_para_codificar = data.copy()
    if expires_delta:
        expiracao = datetime.utcnow() + expires_delta
    else:
        expiracao = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    dados_para_codificar.update({"exp": expiracao})
    jwt_codificado = jwt.encode(dados_para_codificar, SECRET_KEY, algorithm=ALGORITHM)
    return jwt_codificado

def verify_token(token: str):
    try:
        carga_util = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return carga_util
    except JWTError:
        return None
