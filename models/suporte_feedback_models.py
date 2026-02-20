from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base


class StatusFeedback(str, enum.Enum):
    PENDENTE = "PENDENTE"
    LIDA = "LIDA"


class SuporteFeedback(Base):
    __tablename__ = "suporte_feedback"

    id = Column(Integer, primary_key=True, autoincrement=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    assunto = Column(String(50), nullable=False)
    mensagem = Column(Text, nullable=False)
    status = Column(String(20), default=StatusFeedback.PENDENTE, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    usuario = relationship("Usuario", backref="feedbacks")
