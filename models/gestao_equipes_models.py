from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Microarea(Base):
    __tablename__ = "microareas"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ubs_id = Column(Integer, ForeignKey("ubs.id", ondelete="CASCADE"), nullable=False)
    nome = Column(String(100), nullable=False)
    status = Column(String(20), nullable=False, default="COBERTA")  # COBERTA | DESCOBERTA
    populacao = Column(Integer, nullable=False, default=0)
    familias = Column(Integer, nullable=False, default=0)
    geojson = Column(JSONB().with_variant(JSON, "sqlite"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    ubs = relationship("UBS", backref="microareas")
    agentes = relationship("AgenteSaude", back_populates="microarea", cascade="all, delete-orphan")


class AgenteSaude(Base):
    __tablename__ = "agentes_saude"

    id = Column(Integer, primary_key=True, autoincrement=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    microarea_id = Column(Integer, ForeignKey("microareas.id", ondelete="CASCADE"), nullable=False)
    ativo = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    usuario = relationship("Usuario", backref="agente_saude")
    microarea = relationship("Microarea", back_populates="agentes")
