from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Date,
    DateTime,
    Boolean,
    ForeignKey,
    UniqueConstraint,
    Numeric,
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from database import Base


class UBS(Base):
    __tablename__ = "ubs"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Suporte multi-tenant (por organização). Por enquanto, usamos um id inteiro simples.
    tenant_id = Column(Integer, nullable=False)
    owner_user_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)

    # Nome da unidade e nome amigável do relatório situacional gerado para essa UBS
    nome_ubs = Column(String(255), nullable=False)
    nome_relatorio = Column(String(255), nullable=True)
    cnes = Column(String(32), nullable=False)
    area_atuacao = Column(Text, nullable=False)

    numero_habitantes_ativos = Column(Integer, nullable=False, default=0)
    numero_microareas = Column(Integer, nullable=False, default=0)
    numero_familias_cadastradas = Column(Integer, nullable=False, default=0)
    numero_domicilios = Column(Integer, nullable=False, default=0)
    domicilios_rurais = Column(Integer, nullable=True)

    data_inauguracao = Column(Date, nullable=True)
    data_ultima_reforma = Column(Date, nullable=True)

    descritivos_gerais = Column(Text, nullable=True)
    observacoes_gerais = Column(Text, nullable=True)

    outros_servicos = Column(Text, nullable=True)

    # Metadados do relatório situacional
    periodo_referencia = Column(String(50), nullable=True)
    identificacao_equipe = Column(String(100), nullable=True)
    responsavel_nome = Column(String(255), nullable=True)
    responsavel_cargo = Column(String(255), nullable=True)
    responsavel_contato = Column(String(255), nullable=True)
    fluxo_agenda_acesso = Column(Text, nullable=True)

    status = Column(String(20), nullable=False, default="DRAFT")
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    submitted_by = Column(Integer, ForeignKey("usuarios.id"), nullable=True)

    is_deleted = Column(Boolean, nullable=False, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    services = relationship("UBSService", back_populates="ubs", cascade="all, delete-orphan")
    indicators = relationship("Indicator", back_populates="ubs", cascade="all, delete-orphan")
    professional_groups = relationship(
        "ProfessionalGroup", back_populates="ubs", cascade="all, delete-orphan"
    )
    territory_profile = relationship(
        "TerritoryProfile", back_populates="ubs", uselist=False, cascade="all, delete-orphan"
    )
    needs = relationship("UBSNeeds", back_populates="ubs", uselist=False, cascade="all, delete-orphan")

    attachments = relationship(
        "UBSAttachment", back_populates="ubs", cascade="all, delete-orphan"
    )


class UBSAttachment(Base):
    __tablename__ = "ubs_attachments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ubs_id = Column(Integer, ForeignKey("ubs.id", ondelete="CASCADE"), nullable=False)

    original_filename = Column(String(255), nullable=False)
    content_type = Column(String(100), nullable=True)
    size_bytes = Column(Integer, nullable=False, default=0)
    storage_path = Column(Text, nullable=False)

    # Indica em qual seção do PDF este anexo deve aparecer
    section = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    ubs = relationship("UBS", back_populates="attachments")


class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False, unique=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    ubs_links = relationship("UBSService", back_populates="service")


class UBSService(Base):
    __tablename__ = "ubs_services"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ubs_id = Column(Integer, ForeignKey("ubs.id", ondelete="CASCADE"), nullable=False)
    service_id = Column(Integer, ForeignKey("services.id", ondelete="CASCADE"), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    ubs = relationship("UBS", back_populates="services")
    service = relationship("Service", back_populates="ubs_links")

    __table_args__ = (
        UniqueConstraint("ubs_id", "service_id", name="uq_ubs_service"),
    )


class Indicator(Base):
    __tablename__ = "indicators"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ubs_id = Column(Integer, ForeignKey("ubs.id", ondelete="CASCADE"), nullable=False)

    nome_indicador = Column(String(255), nullable=False)
    valor = Column(Numeric(18, 4), nullable=False)
    meta = Column(Numeric(18, 4), nullable=True)
    tipo_valor = Column(String(40), nullable=True, default="PERCENTUAL")
    periodo_referencia = Column(String(100), nullable=False)
    observacoes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    updated_by = Column(Integer, ForeignKey("usuarios.id"), nullable=True)

    ubs = relationship("UBS", back_populates="indicators")


class ProfessionalGroup(Base):
    __tablename__ = "professional_groups"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ubs_id = Column(Integer, ForeignKey("ubs.id", ondelete="CASCADE"), nullable=False)

    cargo_funcao = Column(String(255), nullable=False)
    quantidade = Column(Integer, nullable=False, default=0)
    tipo_vinculo = Column(String(50), nullable=True)
    observacoes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    updated_by = Column(Integer, ForeignKey("usuarios.id"), nullable=True)

    ubs = relationship("UBS", back_populates="professional_groups")


class TerritoryProfile(Base):
    __tablename__ = "territory_profiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ubs_id = Column(Integer, ForeignKey("ubs.id", ondelete="CASCADE"), nullable=False, unique=True)

    descricao_territorio = Column(Text, nullable=False)
    potencialidades_territorio = Column(Text, nullable=True)
    riscos_vulnerabilidades = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    updated_by = Column(Integer, ForeignKey("usuarios.id"), nullable=True)

    ubs = relationship("UBS", back_populates="territory_profile")


class UBSNeeds(Base):
    __tablename__ = "ubs_needs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ubs_id = Column(Integer, ForeignKey("ubs.id", ondelete="CASCADE"), nullable=False, unique=True)

    problemas_identificados = Column(Text, nullable=False)
    necessidades_equipamentos_insumos = Column(Text, nullable=True)
    necessidades_especificas_acs = Column(Text, nullable=True)
    necessidades_infraestrutura_manutencao = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    updated_by = Column(Integer, ForeignKey("usuarios.id"), nullable=True)

    ubs = relationship("UBS", back_populates="needs")
