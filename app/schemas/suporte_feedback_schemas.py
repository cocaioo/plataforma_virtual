from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class SuporteFeedbackCreate(BaseModel):
    assunto: str
    mensagem: str


class SuporteFeedbackUpdateStatus(BaseModel):
    status: str


class SuporteFeedbackResponse(BaseModel):
    id: int
    usuario_id: int
    assunto: str
    mensagem: str
    status: str
    created_at: datetime

    nome_usuario: Optional[str] = None
    email_usuario: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
