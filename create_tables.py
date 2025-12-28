import asyncio

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncEngine

from database import engine, Base, AsyncSessionLocal

# Importa os modelos para que o metadata do SQLAlchemy os conheça
import models.auth_models  # noqa: F401
import models.diagnostico_models  # noqa: F401
from models.diagnostico_models import Service


async def init_db(async_engine: AsyncEngine) -> None:
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


if __name__ == "__main__":
    asyncio.run(init_db(engine))
