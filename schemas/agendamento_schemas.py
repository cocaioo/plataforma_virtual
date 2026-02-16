from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List
from models.agendamento_models import StatusAgendamento

# --- Schemas de Agendamento ---

class AgendamentoBase(BaseModel):
    profissional_id: int
    data_hora: datetime
    observacoes: Optional[str] = None

class AgendamentoCreate(AgendamentoBase):
    pass

class AgendamentoUpdate(BaseModel):
    data_hora: Optional[datetime] = None
    status: Optional[StatusAgendamento] = None
    observacoes: Optional[str] = None

class AgendamentoResponse(AgendamentoBase):
    id: int
    paciente_id: int
    status: str
    confirmacao_enviada: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Detalhes relacionais (simplificados)
    nome_paciente: Optional[str] = None
    nome_profissional: Optional[str] = None
    cargo_profissional: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# --- Schemas de Bloqueio de Agenda ---

class BloqueioAgendaBase(BaseModel):
    data_inicio: datetime
    data_fim: datetime
    motivo: Optional[str] = None

class BloqueioAgendaCreate(BloqueioAgendaBase):
    profissional_id: Optional[int] = None

class BloqueioAgendaResponse(BloqueioAgendaBase):
    id: int
    profissional_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
