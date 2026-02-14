import pytest
from datetime import datetime, timedelta, timezone

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from main import app
from database import Base, get_db
from models.auth_models import Usuario, ProfissionalUbs
from models.agendamento_models import Agendamento, StatusAgendamento
from utils.jwt_handler import create_access_token


async def _create_user(session: AsyncSession, email: str, role: str = "USER", telefone: str | None = None) -> Usuario:
    user = Usuario(
        nome="Usuario Teste",
        email=email,
        senha="hashed",
        cpf=str(abs(hash(email)) % 10**11).zfill(11),
        role=role,
        telefone=telefone,
        ativo=True,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def _create_profissional(session: AsyncSession, email: str, cargo: str = "Medico") -> ProfissionalUbs:
    user = await _create_user(session, email=email, role="PROFISSIONAL")
    prof = ProfissionalUbs(
        usuario_id=user.id,
        cargo=cargo,
        registro_professional=f"REG-{user.id}",
        ativo=True,
    )
    session.add(prof)
    await session.commit()
    await session.refresh(prof)
    return prof


def _auth_headers(user: Usuario) -> dict:
    token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def test_client():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", future=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def override_get_db():
        async with async_session() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client, async_session

    app.dependency_overrides.clear()
    await engine.dispose()


@pytest.mark.asyncio
async def test_especialidades_list(test_client):
    client, async_session = test_client
    async with async_session() as session:
        await _create_profissional(session, "prof1@example.com", cargo="Medico")
        await _create_profissional(session, "prof2@example.com", cargo="Dentista")
        user = await _create_user(session, "user@example.com")
        headers = _auth_headers(user)

    response = await client.get("/api/agendamentos/especialidades", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "Medico" in data
    assert "Dentista" in data


@pytest.mark.asyncio
async def test_create_agendamento_rejects_over_two_weeks(test_client):
    client, async_session = test_client
    async with async_session() as session:
        prof = await _create_profissional(session, "prof3@example.com", cargo="Enfermeiro")
        user = await _create_user(session, "user2@example.com")
        headers = _auth_headers(user)

    payload = {
        "profissional_id": prof.id,
        "data_hora": (datetime.now(timezone.utc) + timedelta(days=15)).isoformat(),
        "observacoes": "Teste"
    }
    response = await client.post("/api/agendamentos", json=payload, headers=headers)
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_reschedule_sets_reagendado_status(test_client):
    client, async_session = test_client
    async with async_session() as session:
        prof = await _create_profissional(session, "prof4@example.com", cargo="Medico")
        user = await _create_user(session, "user3@example.com")
        agendamento = Agendamento(
            paciente_id=user.id,
            profissional_id=prof.id,
            data_hora=datetime.now(timezone.utc) + timedelta(days=2),
            status=StatusAgendamento.AGENDADO,
        )
        session.add(agendamento)
        await session.commit()
        await session.refresh(agendamento)
        headers = _auth_headers(user)

    payload = {
        "data_hora": (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
    }
    response = await client.patch(f"/api/agendamentos/{agendamento.id}", json=payload, headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "REAGENDADO"


@pytest.mark.asyncio
async def test_acs_can_view_agenda(test_client):
    client, async_session = test_client
    async with async_session() as session:
        prof = await _create_profissional(session, "prof5@example.com", cargo="Medico")
        paciente = await _create_user(session, "user4@example.com")
        acs_user = await _create_user(session, "acs@example.com", role="ACS")
        agendamento = Agendamento(
            paciente_id=paciente.id,
            profissional_id=prof.id,
            data_hora=datetime.now(timezone.utc) + timedelta(days=1),
            status=StatusAgendamento.AGENDADO,
        )
        session.add(agendamento)
        await session.commit()
        headers = _auth_headers(acs_user)

    start = datetime.now(timezone.utc).isoformat()
    end = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    response = await client.get(
        f"/api/agenda/profissional/{prof.id}?start_date={start}&end_date={end}",
        headers=headers
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_block_other_professional_requires_gestor(test_client):
    client, async_session = test_client
    async with async_session() as session:
        prof = await _create_profissional(session, "prof6@example.com", cargo="Medico")
        recep = await _create_user(session, "recep@example.com", role="RECEPCAO")
        headers = _auth_headers(recep)

    payload = {
        "profissional_id": prof.id,
        "data_inicio": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        "data_fim": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
        "motivo": "Teste"
    }
    response = await client.post("/api/agenda/bloqueios", json=payload, headers=headers)
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_confirmacao_registers_timestamp(test_client):
    client, async_session = test_client
    async with async_session() as session:
        prof = await _create_profissional(session, "prof7@example.com", cargo="Medico")
        paciente = await _create_user(session, "user5@example.com")
        recep = await _create_user(session, "recep2@example.com", role="RECEPCAO")
        agendamento = Agendamento(
            paciente_id=paciente.id,
            profissional_id=prof.id,
            data_hora=datetime.now(timezone.utc) + timedelta(days=1),
            status=StatusAgendamento.AGENDADO,
        )
        session.add(agendamento)
        await session.commit()
        await session.refresh(agendamento)
        headers = _auth_headers(recep)

    response = await client.post(f"/api/agendamentos/{agendamento.id}/confirmar", headers=headers)
    assert response.status_code == 200
    assert response.json()["confirmacao_enviada"] is not None
