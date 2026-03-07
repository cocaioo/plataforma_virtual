from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime


# ─── Microarea ────────────────────────────────────────────────────────

class MicroareaCreate(BaseModel):
    ubs_id: int
    nome: str
    localidades: List[str]
    descricao: str = Field(min_length=1)
    observacoes: Optional[str] = None
    status: str = "COBERTA"
    populacao: int = 0
    familias: int = 0


class MicroareaUpdate(BaseModel):
    nome: Optional[str] = None
    localidades: Optional[List[str]] = None
    descricao: Optional[str] = None
    observacoes: Optional[str] = None
    status: Optional[str] = None
    populacao: Optional[int] = None
    familias: Optional[int] = None


class MicroareaOut(BaseModel):
    id: int
    ubs_id: int
    nome: str
    localidades: List[str]
    descricao: str
    observacoes: Optional[str] = None
    status: str
    populacao: int
    familias: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ─── Agente de Saúde ─────────────────────────────────────────────────

class AgenteSaudeCreate(BaseModel):
    usuario_id: int
    microarea_id: Optional[int] = None
    ativo: bool = True


class AgenteSaudeUpdate(BaseModel):
    usuario_id: Optional[int] = None
    microarea_id: Optional[int] = None
    ativo: Optional[bool] = None


class AgenteSaudeOut(BaseModel):
    id: int
    usuario_id: int
    microarea_id: Optional[int] = None
    ativo: bool
    nome: Optional[str] = None
    microarea_nome: Optional[str] = None
    familias: Optional[int] = None
    pacientes: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class MicroareaAgentesUpdate(BaseModel):
    usuario_ids: List[int]


# ─── KPIs do Território ──────────────────────────────────────────────

class KpisTerritorioOut(BaseModel):
    populacao_adscrita: int
    familias_cadastradas: int
    microareas_descobertas: int
    cobertura_esf: float


class AcsUserOut(BaseModel):
    id: int
    nome: str
    email: str
