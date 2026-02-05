from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base

class StatusAgendamento(str, enum.Enum):
    AGENDADO = "AGENDADO"
    CANCELADO = "CANCELADO"
    REALIZADO = "REALIZADO"
    REAGENDADO = "REAGENDADO"

class Agendamento(Base):
    __tablename__ = "agendamentos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    paciente_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    profissional_id = Column(Integer, ForeignKey("profissionais.id"), nullable=False)
    
    data_hora = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(20), default=StatusAgendamento.AGENDADO, nullable=False)
    observacoes = Column(Text, nullable=True)
    
    # Campo para controle de notificações (Ex: enviado confirmação)
    confirmacao_enviada = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    paciente = relationship("Usuario", backref="meus_agendamentos")
    profissional = relationship("ProfissionalUbs", backref="agenda")

class BloqueioAgenda(Base):
    __tablename__ = "bloqueios_agenda"

    id = Column(Integer, primary_key=True, autoincrement=True)
    profissional_id = Column(Integer, ForeignKey("profissionais.id"), nullable=False)
    
    data_inicio = Column(DateTime(timezone=True), nullable=False)
    data_fim = Column(DateTime(timezone=True), nullable=False)
    motivo = Column(String(255), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    profissional = relationship("ProfissionalUbs", backref="bloqueios")
