from datetime import datetime, date
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class CronogramaBase(BaseModel):
    ubs_id: int
    titulo: str = Field(..., max_length=255)
    tipo: str = Field(..., max_length=30)
    local: Optional[str] = Field(None, max_length=255)
    inicio: datetime
    fim: Optional[datetime] = None
    dia_inteiro: bool = False
    observacoes: Optional[str] = None

    recorrencia: str = Field(default="NONE", max_length=20)
    recorrencia_intervalo: int = Field(default=1, ge=1)
    recorrencia_fim: Optional[date] = None


class CronogramaCreate(CronogramaBase):
    pass


class CronogramaUpdate(BaseModel):
    titulo: Optional[str] = Field(None, max_length=255)
    tipo: Optional[str] = Field(None, max_length=30)
    local: Optional[str] = Field(None, max_length=255)
    inicio: Optional[datetime] = None
    fim: Optional[datetime] = None
    dia_inteiro: Optional[bool] = None
    observacoes: Optional[str] = None
    recorrencia: Optional[str] = Field(None, max_length=20)
    recorrencia_intervalo: Optional[int] = Field(None, ge=1)
    recorrencia_fim: Optional[date] = None


class CronogramaOut(CronogramaBase):
    id: int
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    model_config = ConfigDict(from_attributes=True)
