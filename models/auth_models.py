# ORM -> Escreve uma classe, como se fosse POO, e ele traduz para SQL
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import declarative_base



# Base declarativa compartilhada pelas tabelas
base = declarative_base()

# Criar classes/tabelas do BD
class Usuario(base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, autoincrement=True, nullable= False)
    nome = Column(String(100), nullable=False)
    email = Column(String(200), nullable=False, unique=True)
    senha = Column(String(255), nullable=False)
    cpf = Column(String(14), nullable=False, unique=True)
    ativo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

#Gestor vai cadastrar o profissional da UBS
class ProfissionalUbs(base):
    __tablename__ = "profissionais"

    id = Column(Integer, primary_key=True, autoincrement=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    cargo = Column(String(100), nullable=False)
    registro_profissional = Column(String(50), unique=True, nullable=False)
    ativo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

# executa a criação dos metadados do seu banco -> cria de fato o banco de dados
# Exemplo de uso (quando link_DB estiver preenchido):
# if db is not None:
#     base.metadata.create_all(db)
