from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field, ValidationInfo, field_validator


class UBSStatus(str, Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"


class IndicatorValueType(str, Enum):
    PERCENTUAL = "PERCENTUAL"
    ABSOLUTO = "ABSOLUTO"
    POR_1000 = "POR_1000"


class UBSBase(BaseModel):
    nome_relatorio: Optional[str] = Field(None, max_length=255)
    nome_ubs: Optional[str] = Field(None, max_length=255)
    cnes: Optional[str] = Field(None, max_length=32)
    area_atuacao: Optional[str]

    numero_habitantes_ativos: Optional[int] = Field(None, ge=0)
    numero_microareas: Optional[int] = Field(None, ge=0)
    numero_familias_cadastradas: Optional[int] = Field(None, ge=0)
    numero_domicilios: Optional[int] = Field(None, ge=0)
    domicilios_rurais: Optional[int] = Field(None, ge=0)

    data_inauguracao: Optional[date]
    data_ultima_reforma: Optional[date]

    descritivos_gerais: Optional[str]
    observacoes_gerais: Optional[str]

    outros_servicos: Optional[str]

    # Metadados do relatório situacional
    periodo_referencia: Optional[str] = Field(None, max_length=50)
    identificacao_equipe: Optional[str] = Field(None, max_length=100)
    responsavel_nome: Optional[str] = Field(None, max_length=255)
    responsavel_cargo: Optional[str] = Field(None, max_length=255)
    responsavel_contato: Optional[str] = Field(None, max_length=255)
    fluxo_agenda_acesso: Optional[str]

    class Config:
        from_attributes = True


class UBSCreate(UBSBase):
    # Na criação em modo rascunho ainda exigimos alguns campos básicos
    nome_ubs: str = Field(..., max_length=255)
    cnes: str = Field(..., max_length=32)
    area_atuacao: str


class UBSUpdate(UBSBase):
    pass


class UBSOut(UBSBase):
    id: int
    status: UBSStatus
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    submitted_at: Optional[datetime]


class UBSAttachmentOut(BaseModel):
    id: int
    ubs_id: int
    original_filename: str
    content_type: Optional[str]
    size_bytes: int
    section: Optional[str] = None
    description: Optional[str] = None
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class ServicesCatalogItem(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class UBSServicesPayload(BaseModel):
    service_ids: List[int] = Field(default_factory=list)
    outros_servicos: Optional[str] = None


class UBSServicesOut(BaseModel):
    services: List[ServicesCatalogItem]
    outros_servicos: Optional[str]


class IndicatorBase(BaseModel):
    nome_indicador: str = Field(..., max_length=255)
    tipo_valor: IndicatorValueType = Field(default=IndicatorValueType.PERCENTUAL)
    valor: float = Field(...)
    meta: Optional[float] = Field(None)
    periodo_referencia: str = Field(..., max_length=100)
    observacoes: Optional[str]

    @staticmethod
    def _validate_by_type(value: float, tipo_valor: IndicatorValueType, field_name: str) -> float:
        if value < 0:
            raise ValueError(f"{field_name} deve ser maior ou igual a 0")
        if tipo_valor == IndicatorValueType.PERCENTUAL and value > 100:
            raise ValueError(f"{field_name} deve estar entre 0 e 100")
        return value

    @field_validator("valor")
    @classmethod
    def _validate_valor(cls, value: float, info: ValidationInfo) -> float:
        tipo_valor = info.data.get("tipo_valor") or IndicatorValueType.PERCENTUAL
        return cls._validate_by_type(value, tipo_valor, "valor")

    @field_validator("meta")
    @classmethod
    def _validate_meta(cls, value: Optional[float], info: ValidationInfo) -> Optional[float]:
        if value is None:
            return value
        tipo_valor = info.data.get("tipo_valor") or IndicatorValueType.PERCENTUAL
        return cls._validate_by_type(value, tipo_valor, "meta")


class IndicatorCreate(IndicatorBase):
    pass


class IndicatorUpdate(BaseModel):
    nome_indicador: Optional[str] = Field(None, max_length=255)
    tipo_valor: Optional[IndicatorValueType] = None
    valor: Optional[float]
    meta: Optional[float]
    periodo_referencia: Optional[str] = Field(None, max_length=100)
    observacoes: Optional[str]

    @field_validator("valor")
    @classmethod
    def _validate_valor(cls, value: Optional[float], info: ValidationInfo) -> Optional[float]:
        if value is None:
            return value
        tipo_valor = info.data.get("tipo_valor")
        if tipo_valor is None:
            if value < 0:
                raise ValueError("valor deve ser maior ou igual a 0")
            return value
        return IndicatorBase._validate_by_type(value, tipo_valor, "valor")

    @field_validator("meta")
    @classmethod
    def _validate_meta(cls, value: Optional[float], info: ValidationInfo) -> Optional[float]:
        if value is None:
            return value
        tipo_valor = info.data.get("tipo_valor")
        if tipo_valor is None:
            if value < 0:
                raise ValueError("meta deve ser maior ou igual a 0")
            return value
        return IndicatorBase._validate_by_type(value, tipo_valor, "meta")


class IndicatorOut(IndicatorBase):
    id: int
    ubs_id: int
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class ProfessionalGroupBase(BaseModel):
    cargo_funcao: str = Field(..., max_length=255)
    quantidade: int = Field(..., ge=0)
    tipo_vinculo: Optional[str] = Field(None, max_length=50)
    observacoes: Optional[str]


class ProfessionalGroupCreate(ProfessionalGroupBase):
    pass


class ProfessionalGroupUpdate(BaseModel):
    cargo_funcao: Optional[str] = Field(None, max_length=255)
    quantidade: Optional[int] = Field(None, ge=0)
    tipo_vinculo: Optional[str] = Field(None, max_length=50)
    observacoes: Optional[str]


class ProfessionalGroupOut(ProfessionalGroupBase):
    id: int
    ubs_id: int
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class TerritoryProfileBase(BaseModel):
    descricao_territorio: str
    potencialidades_territorio: Optional[str] = None
    riscos_vulnerabilidades: Optional[str] = None


class TerritoryProfileCreate(TerritoryProfileBase):
    pass


class TerritoryProfileUpdate(BaseModel):
    descricao_territorio: Optional[str] = None
    potencialidades_territorio: Optional[str] = None
    riscos_vulnerabilidades: Optional[str] = None


class TerritoryProfileOut(TerritoryProfileBase):
    id: int
    ubs_id: int

    class Config:
        from_attributes = True


class UBSNeedsBase(BaseModel):
    problemas_identificados: str
    necessidades_equipamentos_insumos: Optional[str] = None
    necessidades_especificas_acs: Optional[str] = None
    necessidades_infraestrutura_manutencao: Optional[str] = None


class UBSNeedsCreate(UBSNeedsBase):
    pass


class UBSNeedsUpdate(BaseModel):
    problemas_identificados: Optional[str] = None
    necessidades_equipamentos_insumos: Optional[str] = None
    necessidades_especificas_acs: Optional[str] = None
    necessidades_infraestrutura_manutencao: Optional[str] = None


class UBSNeedsOut(UBSNeedsBase):
    id: int
    ubs_id: int

    class Config:
        from_attributes = True


class PaginatedUBS(BaseModel):
    items: List[UBSOut]
    total: int
    page: int
    page_size: int


class UBSSubmissionMetadata(BaseModel):
    status: UBSStatus
    submitted_at: Optional[datetime]
    submitted_by: Optional[int]


class FullDiagnosisOut(BaseModel):
    ubs: UBSOut
    services: UBSServicesOut
    indicators_latest: List[IndicatorOut]
    professional_groups: List[ProfessionalGroupOut]
    territory_profile: Optional[TerritoryProfileOut]
    needs: Optional[UBSNeedsOut]
    attachments: List[UBSAttachmentOut] = Field(default_factory=list)
    submission: UBSSubmissionMetadata


class SubmitDiagnosisResponse(BaseModel):
    status: UBSStatus
    submitted_at: datetime


class ErrorDetail(BaseModel):
    field: str
    message: str
    code: str


class ValidationErrorResponse(BaseModel):
    detail: str
    errors: List[ErrorDetail]


class UBSSubmitRequest(BaseModel):
    """Payload opcional reservado para uso futuro (ex.: flags de confirmação)."""

    confirm: bool = True

    @field_validator("confirm")
    @classmethod
    def must_be_true(cls, v: bool) -> bool:
        if not v:
            raise ValueError("Confirmação obrigatória para envio do diagnóstico")
        return v
