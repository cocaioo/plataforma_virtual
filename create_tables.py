import asyncio
import sys

# FIX obrigatório para Windows + psycopg3 async
if sys.platform.startswith("win"):
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncEngine

from database import engine, Base, AsyncSessionLocal

# Importa os modelos para registrar no metadata
import models.auth_models  # noqa: F401
import models.diagnostico_models  # noqa: F401
from models.diagnostico_models import Service


async def init_db(async_engine: AsyncEngine) -> None:
    # Cria todas as tabelas
    async with async_engine.begin() as conexao:
        await conexao.run_sync(Base.metadata.create_all)

    # Popula o catálogo de serviços se estiver vazio
    async with AsyncSessionLocal() as sessao:
        resultado = await sessao.execute(select(Service))
        if resultado.scalars().first() is None:
            servicos_padrao = [
                "Programa Saúde da Família",
                "Atendimento médico",
                "Atendimento de enfermagem",
                "Atendimento odontológico",
                "Atendimento de urgência / acolhimento",
                "Procedimentos (curativos, inalação, etc.)",
                "Sala de vacina",
                "Saúde da criança",
                "Saúde da mulher",
                "Saúde do homem",
                "Saúde do idoso",
                "Planejamento familiar",
                "Pré-natal",
                "Puericultura",
                "Atendimento a condições crônicas (hipertensão, diabetes, etc.)",
                "Programa Saúde na Escola (PSE)",
                "Saúde mental",
                "Atendimento multiprofissional (NASF ou equivalente)",
                "Testes rápidos de IST",
                "Vigilância epidemiológica",
                "Vigilância em saúde ambiental",
                "Visitas domiciliares",
                "Atividades coletivas e preventivas",
                "Grupos operativos (gestantes, tabagismo, etc.)",
            ]

            for nome in servicos_padrao:
                sessao.add(Service(name=nome))

            await sessao.commit()
            print("✔ Serviços padrão inseridos com sucesso.")
        else:
            print("ℹ Serviços já existentes. Nada a inserir.")


if __name__ == "__main__":
    asyncio.run(init_db(engine))
