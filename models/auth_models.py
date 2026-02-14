from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, func, Text
from database import Base

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, autoincrement=True, nullable= False)
    nome = Column(String(100), nullable=False)
    email = Column(String(200), nullable=False, unique=True)
    senha = Column(String(255), nullable=False)
    cpf = Column(String(14), nullable=False, unique=True)
    # USER | PROFISSIONAL | GESTOR | RECEPCAO | ACS
    role = Column(String(20), nullable=False, default="USER")
    welcome_email_sent = Column(Boolean, default=False, nullable=True)
    ativo = Column(Boolean, default=True, nullable=False)
    tentativas_login = Column(Integer, default=0, nullable=False)
    bloqueado_ate = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class ProfissionalUbs(Base):
    __tablename__ = "profissionais"

    id = Column(Integer, primary_key=True, autoincrement=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    cargo = Column(String(100), nullable=False)
    registro_professional = Column(String(50), unique=True, nullable=False)
    ativo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class LoginAttempt(Base):
    __tablename__ = "login_attempts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(200), nullable=False)
    ip_address = Column(String(45), nullable=True)
    sucesso = Column(Boolean, nullable=False)
    motivo = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ProfessionalRequest(Base):
    __tablename__ = "professional_requests"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False, unique=True)
    cargo = Column(String(100), nullable=False)
    registro_profissional = Column(String(50), nullable=False, unique=True)
    status = Column(String(20), nullable=False, default="PENDING")  # PENDING | APPROVED | REJECTED
    rejection_reason = Column(String(255), nullable=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_by_user_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
