import enum

from sqlalchemy import Column, Integer, String, Text, DateTime, Date, Boolean, ForeignKey
from sqlalchemy.sql import func

from database import Base


class CronogramaTipo(str, enum.Enum):
    SALA_VACINA = "SALA_VACINA"
    FARMACIA_BASICA = "FARMACIA_BASICA"
    REUNIAO_EQUIPE = "REUNIAO_EQUIPE"
    OUTRO = "OUTRO"


class RecurrenceType(str, enum.Enum):
    NONE = "NONE"
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    MONTHLY = "MONTHLY"


class CronogramaEvent(Base):
    __tablename__ = "cronograma_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ubs_id = Column(Integer, ForeignKey("ubs.id", ondelete="CASCADE"), nullable=False)

    titulo = Column(String(255), nullable=False)
    tipo = Column(String(30), nullable=False, default=CronogramaTipo.OUTRO.value)
    local = Column(String(255), nullable=True)
    inicio = Column(DateTime(timezone=True), nullable=False)
    fim = Column(DateTime(timezone=True), nullable=True)
    dia_inteiro = Column(Boolean, nullable=False, default=False)
    observacoes = Column(Text, nullable=True)

    recorrencia = Column(String(20), nullable=False, default=RecurrenceType.NONE.value)
    recorrencia_intervalo = Column(Integer, nullable=False, default=1)
    recorrencia_fim = Column(Date, nullable=True)

    created_by = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    updated_by = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
