# ORM -> Escreve uma classe, como se fosse POO, e ele traduz para SQL
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, create_engine, func
from sqlalchemy.orm import declarative_base


# criando conexão com o bd (preencha o link_DB com sua URL real)
link_DB = ""
db = create_engine(link_DB) if link_DB else None

# Criando a base do bd
base = declarative_base()


# Criar classes/tabelas do BD
class Usuario(base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nome = Column(String(100), nullable=False)
    email = Column(String(200), nullable=False, unique=True)
    senha = Column(String(255), nullable=False)  # armazene o hash da senha
    tipo_usuario = Column(String(50), nullable=False)
    cpf = Column(String(14), nullable=False, unique=True)
    ativo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class ProfissionalUbs(base):
    __tablename__ = "profissionais"

    id = Column(Integer, primary_key=True, autoincrement=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    cargo = Column(String(100), nullable=False)
    registro_profissional = Column(String(50), unique=True, nullable=False)
    ubs_id = Column(Integer, ForeignKey("ubs.id"), nullable=False)
    ativo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Ubs(base):
    __tablename__ = "ubs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nome = Column(String(150), nullable=False)
    endereco = Column(String(255), nullable=False)
    telefone = Column(String(20), nullable=True)
    cnes = Column(String(15), unique=True, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now()) #Timestamp para auditoria
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())



# cidadaos = paciente do SUS, que pode ou não ter acesso ao sistema.
class Cidadaos(base):
    __tablename__ = "cidadaos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nome = Column(String(200), nullable=False)
    cpf = Column(String(14), unique=True, nullable=False)
    telefone = Column(String(20), nullable=True)
    email = Column(String(200), unique=True, nullable=True)
    endereco = Column(String(255), nullable=True)
    ubs_id = Column(Integer, ForeignKey("ubs.id"), nullable=True)
    ativo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())



# executa a criação dos metadados do seu banco -> cria de fato o banco de dados
# Exemplo de uso (quando link_DB estiver preenchido):
# if db is not None:
#     base.metadata.create_all(db)
