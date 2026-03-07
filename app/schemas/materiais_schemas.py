from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, ConfigDict, Field


class EducationalMaterialBase(BaseModel):
    ubs_id: int
    titulo: str = Field(..., max_length=255)
    descricao: Optional[str] = None
    categoria: Optional[str] = Field(None, max_length=80)
    publico_alvo: Optional[str] = Field(None, max_length=80)
    ativo: bool = True


class EducationalMaterialCreate(EducationalMaterialBase):
    pass


class EducationalMaterialUpdate(BaseModel):
    titulo: Optional[str] = Field(None, max_length=255)
    descricao: Optional[str] = None
    categoria: Optional[str] = Field(None, max_length=80)
    publico_alvo: Optional[str] = Field(None, max_length=80)
    ativo: Optional[bool] = None


class EducationalMaterialFileOut(BaseModel):
    id: int
    material_id: int
    original_filename: str
    content_type: Optional[str]
    size_bytes: int
    created_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class EducationalMaterialOut(EducationalMaterialBase):
    id: int
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    files: List[EducationalMaterialFileOut] = []

    model_config = ConfigDict(from_attributes=True)
