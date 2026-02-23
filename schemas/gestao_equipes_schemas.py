from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


# ─── Microarea ────────────────────────────────────────────────────────

class MicroareaCreate(BaseModel):
    ubs_id: int
    nome: str
    status: str = "COBERTA"
    populacao: int = 0
    familias: int = 0
    geojson: Optional[dict] = None


class MicroareaUpdate(BaseModel):
    nome: Optional[str] = None
    status: Optional[str] = None
    populacao: Optional[int] = None
    familias: Optional[int] = None
    geojson: Optional[dict] = None


class MicroareaOut(BaseModel):
    id: int
    ubs_id: int
    nome: str
    status: str
    populacao: int
    familias: int
    geojson: Optional[dict] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ─── Agente de Saúde ─────────────────────────────────────────────────

class AgenteSaudeCreate(BaseModel):
    usuario_id: int
    microarea_id: int
    ativo: bool = True


class AgenteSaudeUpdate(BaseModel):
    microarea_id: Optional[int] = None
    ativo: Optional[bool] = None


class AgenteSaudeOut(BaseModel):
    id: int
    usuario_id: int
    microarea_id: int
    ativo: bool
    nome: Optional[str] = None
    microarea_nome: Optional[str] = None
    familias: Optional[int] = None
    pacientes: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ─── KPIs do Território ──────────────────────────────────────────────

class KpisTerritorioOut(BaseModel):
    populacao_adscrita: int
    familias_cadastradas: int
    microareas_descobertas: int
    cobertura_esf: float
