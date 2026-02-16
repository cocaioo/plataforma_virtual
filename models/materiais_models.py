from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class EducationalMaterial(Base):
    __tablename__ = "educational_materials"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ubs_id = Column(Integer, ForeignKey("ubs.id", ondelete="CASCADE"), nullable=False)

    titulo = Column(String(255), nullable=False)
    descricao = Column(Text, nullable=True)
    categoria = Column(String(80), nullable=True)
    publico_alvo = Column(String(80), nullable=True)
    ativo = Column(Boolean, nullable=False, default=True)

    created_by = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    updated_by = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    files = relationship(
        "EducationalMaterialFile", back_populates="material", cascade="all, delete-orphan"
    )


class EducationalMaterialFile(Base):
    __tablename__ = "educational_material_files"

    id = Column(Integer, primary_key=True, autoincrement=True)
    material_id = Column(Integer, ForeignKey("educational_materials.id", ondelete="CASCADE"), nullable=False)

    original_filename = Column(String(255), nullable=False)
    content_type = Column(String(100), nullable=True)
    size_bytes = Column(Integer, nullable=False, default=0)
    storage_path = Column(Text, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    material = relationship("EducationalMaterial", back_populates="files")
