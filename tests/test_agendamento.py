import pytest
from datetime import datetime, timedelta, timezone

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from main import app
from database import Base, get_db
from models.auth_models import Usuario, ProfissionalUbs
from models.agendamento_models import Agendamento, BloqueioAgenda, StatusAgendamento
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
async def test_create_agendamento_ok(test_client):
    client, async_session = test_client
    async with async_session() as session:
        prof = await _create_profissional(session, "prof_ok@example.com", cargo="Medico")
        user = await _create_user(session, "user_ok@example.com")
        headers = _auth_headers(user)

    payload = {
        "profissional_id": prof.id,
        "data_hora": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
        "observacoes": "Primeira consulta",
    }
    response = await client.post("/api/agendamentos", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "AGENDADO"


@pytest.mark.asyncio
async def test_create_agendamento_rejects_past_date(test_client):
    client, async_session = test_client
    async with async_session() as session:
        prof = await _create_profissional(session, "prof_past@example.com", cargo="Medico")
        user = await _create_user(session, "user_past@example.com")
        headers = _auth_headers(user)

    payload = {
        "profissional_id": prof.id,
        "data_hora": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
    }
    response = await client.post("/api/agendamentos", json=payload, headers=headers)
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_create_agendamento_allows_exact_two_weeks(test_client):
    client, async_session = test_client
    async with async_session() as session:
        prof = await _create_profissional(session, "prof_2w@example.com", cargo="Medico")
        user = await _create_user(session, "user_2w@example.com")
        headers = _auth_headers(user)

    payload = {
        "profissional_id": prof.id,
        "data_hora": (datetime.now(timezone.utc) + timedelta(days=14)).isoformat(),
    }
    response = await client.post("/api/agendamentos", json=payload, headers=headers)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_create_agendamento_conflict_reagendado_status(test_client):
    client, async_session = test_client
    async with async_session() as session:
        prof = await _create_profissional(session, "prof_reag@example.com", cargo="Medico")
        user = await _create_user(session, "user_reag@example.com")
        slot = datetime.now(timezone.utc) + timedelta(days=2)
        agendamento = Agendamento(
            paciente_id=user.id,
            profissional_id=prof.id,
            data_hora=slot,
            status=StatusAgendamento.REAGENDADO,
        )
        session.add(agendamento)
        await session.commit()
        headers = _auth_headers(user)

    payload = {
        "profissional_id": prof.id,
        "data_hora": slot.isoformat(),
    }
    response = await client.post("/api/agendamentos", json=payload, headers=headers)
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_create_agendamento_ignores_cancelado(test_client):
    client, async_session = test_client
    async with async_session() as session:
        prof = await _create_profissional(session, "prof_cancel_slot@example.com", cargo="Medico")
        user = await _create_user(session, "user_cancel_slot@example.com")
        slot = datetime.now(timezone.utc) + timedelta(days=2)
        agendamento = Agendamento(
            paciente_id=user.id,
            profissional_id=prof.id,
            data_hora=slot,
            status=StatusAgendamento.CANCELADO,
        )
        session.add(agendamento)
        await session.commit()
        headers = _auth_headers(user)

    payload = {
        "profissional_id": prof.id,
        "data_hora": slot.isoformat(),
    }
    response = await client.post("/api/agendamentos", json=payload, headers=headers)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_create_agendamento_conflict_same_slot(test_client):
    client, async_session = test_client
    async with async_session() as session:
        prof = await _create_profissional(session, "prof_conflict@example.com", cargo="Medico")
        user = await _create_user(session, "user_conflict@example.com")
        slot = datetime.now(timezone.utc) + timedelta(days=2)
        agendamento = Agendamento(
            paciente_id=user.id,
            profissional_id=prof.id,
            data_hora=slot,
            status=StatusAgendamento.AGENDADO,
        )
        session.add(agendamento)
        await session.commit()
        headers = _auth_headers(user)

    payload = {
        "profissional_id": prof.id,
        "data_hora": slot.isoformat(),
    }
    response = await client.post("/api/agendamentos", json=payload, headers=headers)
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_create_agendamento_conflict_blocked(test_client):
    client, async_session = test_client
    async with async_session() as session:
        prof = await _create_profissional(session, "prof_block@example.com", cargo="Medico")
        user = await _create_user(session, "user_block@example.com")
        start = datetime.now(timezone.utc) + timedelta(days=1)
        end = start + timedelta(hours=4)
        bloqueio = BloqueioAgenda(
            profissional_id=prof.id,
            data_inicio=start,
            data_fim=end,
            motivo="Teste",
        )
        session.add(bloqueio)
        await session.commit()
        headers = _auth_headers(user)

    payload = {
        "profissional_id": prof.id,
        "data_hora": (start + timedelta(hours=1)).isoformat(),
    }
    response = await client.post("/api/agendamentos", json=payload, headers=headers)
    assert response.status_code == 409


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
async def test_update_agendamento_rejects_past_date(test_client):
    client, async_session = test_client
    async with async_session() as session:
        prof = await _create_profissional(session, "prof_up_past@example.com", cargo="Medico")
        user = await _create_user(session, "user_up_past@example.com")
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

    payload = {"data_hora": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()}
    response = await client.patch(f"/api/agendamentos/{agendamento.id}", json=payload, headers=headers)
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_update_agendamento_rejects_over_two_weeks(test_client):
    client, async_session = test_client
    async with async_session() as session:
        prof = await _create_profissional(session, "prof_up_2w@example.com", cargo="Medico")
        user = await _create_user(session, "user_up_2w@example.com")
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

    payload = {"data_hora": (datetime.now(timezone.utc) + timedelta(days=15)).isoformat()}
    response = await client.patch(f"/api/agendamentos/{agendamento.id}", json=payload, headers=headers)
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_update_agendamento_conflict_same_slot(test_client):
    client, async_session = test_client
    async with async_session() as session:
        prof = await _create_profissional(session, "prof_up_conf@example.com", cargo="Medico")
        user = await _create_user(session, "user_up_conf@example.com")
        slot = datetime.now(timezone.utc) + timedelta(days=3)
        existing = Agendamento(
            paciente_id=user.id,
            profissional_id=prof.id,
            data_hora=slot,
            status=StatusAgendamento.AGENDADO,
        )
        moving = Agendamento(
            paciente_id=user.id,
            profissional_id=prof.id,
            data_hora=datetime.now(timezone.utc) + timedelta(days=2),
            status=StatusAgendamento.AGENDADO,
        )
        session.add_all([existing, moving])
        await session.commit()
        await session.refresh(moving)
        headers = _auth_headers(user)

    payload = {"data_hora": slot.isoformat()}
    response = await client.patch(f"/api/agendamentos/{moving.id}", json=payload, headers=headers)
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_update_agendamento_set_observacoes(test_client):
    client, async_session = test_client
    async with async_session() as session:
        prof = await _create_profissional(session, "prof_obs@example.com", cargo="Medico")
        user = await _create_user(session, "user_obs@example.com")
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

    payload = {"observacoes": "Nova observacao"}
    response = await client.patch(f"/api/agendamentos/{agendamento.id}", json=payload, headers=headers)
    assert response.status_code == 200
    assert response.json()["observacoes"] == "Nova observacao"


@pytest.mark.asyncio
async def test_update_agendamento_set_status_realizado(test_client):
    client, async_session = test_client
    async with async_session() as session:
        prof = await _create_profissional(session, "prof_real@example.com", cargo="Medico")
        user = await _create_user(session, "user_real@example.com")
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

    payload = {"status": "REALIZADO"}
    response = await client.patch(f"/api/agendamentos/{agendamento.id}", json=payload, headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "REALIZADO"


@pytest.mark.asyncio
async def test_update_agendamento_owner_cancel(test_client):
    client, async_session = test_client
    async with async_session() as session:
        prof = await _create_profissional(session, "prof_cancel_owner@example.com", cargo="Medico")
        owner = await _create_user(session, "owner_cancel_owner@example.com")
        agendamento = Agendamento(
            paciente_id=owner.id,
            profissional_id=prof.id,
            data_hora=datetime.now(timezone.utc) + timedelta(days=2),
            status=StatusAgendamento.AGENDADO,
        )
        session.add(agendamento)
        await session.commit()
        await session.refresh(agendamento)
        headers = _auth_headers(owner)

    response = await client.patch(
        f"/api/agendamentos/{agendamento.id}",
        json={"status": "CANCELADO"},
        headers=headers
    )
    assert response.status_code == 200
    assert response.json()["status"] == "CANCELADO"


@pytest.mark.asyncio
async def test_update_agendamento_gestor_cancel(test_client):
    client, async_session = test_client
    async with async_session() as session:
        prof = await _create_profissional(session, "prof_gestor_cancel@example.com", cargo="Medico")
        owner = await _create_user(session, "owner_gestor_cancel@example.com")
        gestor = await _create_user(session, "gestor_cancel@example.com", role="GESTOR")
        agendamento = Agendamento(
            paciente_id=owner.id,
            profissional_id=prof.id,
            data_hora=datetime.now(timezone.utc) + timedelta(days=2),
            status=StatusAgendamento.AGENDADO,
        )
        session.add(agendamento)
        await session.commit()
        await session.refresh(agendamento)
        headers = _auth_headers(gestor)

    response = await client.patch(
        f"/api/agendamentos/{agendamento.id}",
        json={"status": "CANCELADO"},
        headers=headers
    )
    assert response.status_code == 200
    assert response.json()["status"] == "CANCELADO"


@pytest.mark.asyncio
async def test_update_agendamento_recepcao_cancel(test_client):
    client, async_session = test_client
    async with async_session() as session:
        prof = await _create_profissional(session, "prof_recep_cancel@example.com", cargo="Medico")
        owner = await _create_user(session, "owner_recep_cancel@example.com")
        recep = await _create_user(session, "recep_cancel2@example.com", role="RECEPCAO")
        agendamento = Agendamento(
            paciente_id=owner.id,
            profissional_id=prof.id,
            data_hora=datetime.now(timezone.utc) + timedelta(days=2),
            status=StatusAgendamento.AGENDADO,
        )
        session.add(agendamento)
        await session.commit()
        await session.refresh(agendamento)
        headers = _auth_headers(recep)

    response = await client.patch(
        f"/api/agendamentos/{agendamento.id}",
        json={"status": "CANCELADO"},
        headers=headers
    )
    assert response.status_code == 200
    assert response.json()["status"] == "CANCELADO"


@pytest.mark.asyncio
async def test_update_agendamento_profissional_cancel(test_client):
    client, async_session = test_client
    async with async_session() as session:
        prof = await _create_profissional(session, "prof_staff_cancel@example.com", cargo="Medico")
        owner = await _create_user(session, "owner_staff_cancel@example.com")
        staff = await _create_user(session, "staff_cancel@example.com", role="PROFISSIONAL")
        agendamento = Agendamento(
            paciente_id=owner.id,
            profissional_id=prof.id,
            data_hora=datetime.now(timezone.utc) + timedelta(days=2),
            status=StatusAgendamento.AGENDADO,
        )
        session.add(agendamento)
        await session.commit()
        await session.refresh(agendamento)
        headers = _auth_headers(staff)

    response = await client.patch(
        f"/api/agendamentos/{agendamento.id}",
        json={"status": "CANCELADO"},
        headers=headers
    )
    assert response.status_code == 200
    assert response.json()["status"] == "CANCELADO"


@pytest.mark.asyncio
async def test_update_agendamento_no_changes(test_client):
    client, async_session = test_client
    async with async_session() as session:
        prof = await _create_profissional(session, "prof_nochange@example.com", cargo="Medico")
        owner = await _create_user(session, "owner_nochange@example.com")
        agendamento = Agendamento(
            paciente_id=owner.id,
            profissional_id=prof.id,
            data_hora=datetime.now(timezone.utc) + timedelta(days=2),
            status=StatusAgendamento.AGENDADO,
        )
        session.add(agendamento)
        await session.commit()
        await session.refresh(agendamento)
        headers = _auth_headers(owner)

    response = await client.patch(
        f"/api/agendamentos/{agendamento.id}",
        json={},
        headers=headers
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_user_cannot_update_other_users_agendamento(test_client):
    client, async_session = test_client
    async with async_session() as session:
        prof = await _create_profissional(session, "prof_owner@example.com", cargo="Medico")
        owner = await _create_user(session, "owner@example.com")
        other_user = await _create_user(session, "other@example.com")
        agendamento = Agendamento(
            paciente_id=owner.id,
            profissional_id=prof.id,
            data_hora=datetime.now(timezone.utc) + timedelta(days=2),
            status=StatusAgendamento.AGENDADO,
        )
        session.add(agendamento)
        await session.commit()
        await session.refresh(agendamento)
        headers = _auth_headers(other_user)

    response = await client.patch(
        f"/api/agendamentos/{agendamento.id}",
        json={"status": "CANCELADO"},
        headers=headers
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_recepcao_can_cancel_agendamento(test_client):
    client, async_session = test_client
    async with async_session() as session:
        prof = await _create_profissional(session, "prof_cancel@example.com", cargo="Medico")
        owner = await _create_user(session, "owner_cancel@example.com")
        recep = await _create_user(session, "recep_cancel@example.com", role="RECEPCAO")
        agendamento = Agendamento(
            paciente_id=owner.id,
            profissional_id=prof.id,
            data_hora=datetime.now(timezone.utc) + timedelta(days=2),
            status=StatusAgendamento.AGENDADO,
        )
        session.add(agendamento)
        await session.commit()
        await session.refresh(agendamento)
        headers = _auth_headers(recep)

    response = await client.patch(
        f"/api/agendamentos/{agendamento.id}",
        json={"status": "CANCELADO"},
        headers=headers
    )
    assert response.status_code == 200
    assert response.json()["status"] == "CANCELADO"


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
        f"/api/agenda/profissional/{prof.id}",
        params={"start_date": start, "end_date": end},
        headers=headers
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_user_cannot_view_agenda(test_client):
    client, async_session = test_client
    async with async_session() as session:
        prof = await _create_profissional(session, "prof_user_view@example.com", cargo="Medico")
        user = await _create_user(session, "user_view@example.com")
        headers = _auth_headers(user)

    start = datetime.now(timezone.utc).isoformat()
    end = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    response = await client.get(
        f"/api/agenda/profissional/{prof.id}",
        params={"start_date": start, "end_date": end},
        headers=headers
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_agenda_requires_dates(test_client):
    client, async_session = test_client
    async with async_session() as session:
        prof = await _create_profissional(session, "prof_need_dates@example.com", cargo="Medico")
        staff = await _create_user(session, "staff_need_dates@example.com", role="RECEPCAO")
        headers = _auth_headers(staff)

    response = await client.get(f"/api/agenda/profissional/{prof.id}", headers=headers)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_agenda_filters_outside_range(test_client):
    client, async_session = test_client
    async with async_session() as session:
        prof = await _create_profissional(session, "prof_range@example.com", cargo="Medico")
        paciente = await _create_user(session, "user_range@example.com")
        inside = Agendamento(
            paciente_id=paciente.id,
            profissional_id=prof.id,
            data_hora=datetime.now(timezone.utc) + timedelta(days=1),
            status=StatusAgendamento.AGENDADO,
        )
        outside = Agendamento(
            paciente_id=paciente.id,
            profissional_id=prof.id,
            data_hora=datetime.now(timezone.utc) + timedelta(days=30),
            status=StatusAgendamento.AGENDADO,
        )
        session.add_all([inside, outside])
        await session.commit()
        staff = await _create_user(session, "staff_range@example.com", role="RECEPCAO")
        headers = _auth_headers(staff)

    start = datetime.now(timezone.utc).isoformat()
    end = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    response = await client.get(
        f"/api/agenda/profissional/{prof.id}",
        params={"start_date": start, "end_date": end},
        headers=headers
    )
    assert response.status_code == 200
    data = response.json()
    assert all(item["data_hora"] <= end for item in data)


@pytest.mark.asyncio
async def test_confirmacao_forbidden_user(test_client):
    client, async_session = test_client
    async with async_session() as session:
        prof = await _create_profissional(session, "prof_conf_forbid@example.com", cargo="Medico")
        paciente = await _create_user(session, "user_conf_forbid@example.com")
        user = await _create_user(session, "user_conf_forbid2@example.com")
        agendamento = Agendamento(
            paciente_id=paciente.id,
            profissional_id=prof.id,
            data_hora=datetime.now(timezone.utc) + timedelta(days=1),
            status=StatusAgendamento.AGENDADO,
        )
        session.add(agendamento)
        await session.commit()
        await session.refresh(agendamento)
        headers = _auth_headers(user)

    response = await client.post(f"/api/agendamentos/{agendamento.id}/confirmar", headers=headers)
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_confirmacao_not_found(test_client):
    client, async_session = test_client
    async with async_session() as session:
        recep = await _create_user(session, "recep_conf_nf@example.com", role="RECEPCAO")
        headers = _auth_headers(recep)

    response = await client.post("/api/agendamentos/99999/confirmar", headers=headers)
    assert response.status_code == 404


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
async def test_block_create_for_self_profissional(test_client):
    client, async_session = test_client
    async with async_session() as session:
        prof = await _create_profissional(session, "prof_self_block@example.com", cargo="Medico")
        user = await session.get(Usuario, prof.usuario_id)
        headers = _auth_headers(user)

    payload = {
        "data_inicio": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        "data_fim": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
        "motivo": "Teste"
    }
    response = await client.post("/api/agenda/bloqueios", json=payload, headers=headers)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_block_create_for_self_non_professional(test_client):
    client, async_session = test_client
    async with async_session() as session:
        user = await _create_user(session, "user_self_block@example.com")
        headers = _auth_headers(user)

    payload = {
        "data_inicio": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        "data_fim": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
        "motivo": "Teste"
    }
    response = await client.post("/api/agenda/bloqueios", json=payload, headers=headers)
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_block_create_for_other_by_gestor(test_client):
    client, async_session = test_client
    async with async_session() as session:
        prof = await _create_profissional(session, "prof_other_block@example.com", cargo="Medico")
        gestor = await _create_user(session, "gestor_block@example.com", role="GESTOR")
        headers = _auth_headers(gestor)

    payload = {
        "profissional_id": prof.id,
        "data_inicio": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        "data_fim": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
        "motivo": "Teste"
    }
    response = await client.post("/api/agenda/bloqueios", json=payload, headers=headers)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_block_create_for_other_by_profissional_forbidden(test_client):
    client, async_session = test_client
    async with async_session() as session:
        prof = await _create_profissional(session, "prof_other_block2@example.com", cargo="Medico")
        other = await _create_profissional(session, "prof_other_block3@example.com", cargo="Medico")
        other_user = await session.get(Usuario, other.usuario_id)
        headers = _auth_headers(other_user)

    payload = {
        "profissional_id": prof.id,
        "data_inicio": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        "data_fim": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
        "motivo": "Teste"
    }
    response = await client.post("/api/agenda/bloqueios", json=payload, headers=headers)
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_list_bloqueios_self(test_client):
    client, async_session = test_client
    async with async_session() as session:
        prof = await _create_profissional(session, "prof_list_block@example.com", cargo="Medico")
        user = await session.get(Usuario, prof.usuario_id)
        bloqueio = BloqueioAgenda(
            profissional_id=prof.id,
            data_inicio=datetime.now(timezone.utc) + timedelta(days=1),
            data_fim=datetime.now(timezone.utc) + timedelta(days=2),
            motivo="Teste",
        )
        session.add(bloqueio)
        await session.commit()
        headers = _auth_headers(user)

    response = await client.get("/api/agenda/bloqueios", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) == 1


@pytest.mark.asyncio
async def test_list_bloqueios_by_profissional_id(test_client):
    client, async_session = test_client
    async with async_session() as session:
        prof = await _create_profissional(session, "prof_list_block2@example.com", cargo="Medico")
        user = await _create_user(session, "user_list_block2@example.com")
        bloqueio = BloqueioAgenda(
            profissional_id=prof.id,
            data_inicio=datetime.now(timezone.utc) + timedelta(days=1),
            data_fim=datetime.now(timezone.utc) + timedelta(days=2),
            motivo="Teste",
        )
        session.add(bloqueio)
        await session.commit()
        headers = _auth_headers(user)

    response = await client.get(
        "/api/agenda/bloqueios",
        params={"profissional_id": prof.id},
        headers=headers
    )
    assert response.status_code == 200
    assert len(response.json()) == 1


@pytest.mark.asyncio
async def test_list_bloqueios_non_professional_returns_empty(test_client):
    client, async_session = test_client
    async with async_session() as session:
        user = await _create_user(session, "user_list_empty@example.com")
        headers = _auth_headers(user)

    response = await client.get("/api/agenda/bloqueios", headers=headers)
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_delete_bloqueio_by_gestor(test_client):
    client, async_session = test_client
    async with async_session() as session:
        prof = await _create_profissional(session, "prof_del_block@example.com", cargo="Medico")
        gestor = await _create_user(session, "gestor_del_block@example.com", role="GESTOR")
        bloqueio = BloqueioAgenda(
            profissional_id=prof.id,
            data_inicio=datetime.now(timezone.utc) + timedelta(days=1),
            data_fim=datetime.now(timezone.utc) + timedelta(days=2),
            motivo="Teste",
        )
        session.add(bloqueio)
        await session.commit()
        await session.refresh(bloqueio)
        headers = _auth_headers(gestor)

    response = await client.delete(f"/api/agenda/bloqueios/{bloqueio.id}", headers=headers)
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_delete_bloqueio_by_owner(test_client):
    client, async_session = test_client
    async with async_session() as session:
        prof = await _create_profissional(session, "prof_del_block2@example.com", cargo="Medico")
        owner = await session.get(Usuario, prof.usuario_id)
        bloqueio = BloqueioAgenda(
            profissional_id=prof.id,
            data_inicio=datetime.now(timezone.utc) + timedelta(days=1),
            data_fim=datetime.now(timezone.utc) + timedelta(days=2),
            motivo="Teste",
        )
        session.add(bloqueio)
        await session.commit()
        await session.refresh(bloqueio)
        headers = _auth_headers(owner)

    response = await client.delete(f"/api/agenda/bloqueios/{bloqueio.id}", headers=headers)
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_delete_bloqueio_forbidden(test_client):
    client, async_session = test_client
    async with async_session() as session:
        prof = await _create_profissional(session, "prof_del_block3@example.com", cargo="Medico")
        other = await _create_profissional(session, "prof_del_block4@example.com", cargo="Medico")
        other_user = await session.get(Usuario, other.usuario_id)
        bloqueio = BloqueioAgenda(
            profissional_id=prof.id,
            data_inicio=datetime.now(timezone.utc) + timedelta(days=1),
            data_fim=datetime.now(timezone.utc) + timedelta(days=2),
            motivo="Teste",
        )
        session.add(bloqueio)
        await session.commit()
        await session.refresh(bloqueio)
        headers = _auth_headers(other_user)

    response = await client.delete(f"/api/agenda/bloqueios/{bloqueio.id}", headers=headers)
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_list_profissionais_only_active(test_client):
    client, async_session = test_client
    async with async_session() as session:
        active = await _create_profissional(session, "prof_active@example.com", cargo="Medico")
        inactive_user = await _create_user(session, "prof_inactive@example.com", role="PROFISSIONAL")
        inactive_prof = ProfissionalUbs(
            usuario_id=inactive_user.id,
            cargo="Medico",
            registro_professional=f"REG-{inactive_user.id}",
            ativo=False,
        )
        session.add(inactive_prof)
        await session.commit()
        user = await _create_user(session, "user_active_list@example.com")
        headers = _auth_headers(user)

    response = await client.get("/api/agendamentos/profissionais", headers=headers)
    assert response.status_code == 200
    data = response.json()
    ids = [item["id"] for item in data]
    assert active.id in ids
    assert inactive_prof.id not in ids


@pytest.mark.asyncio
async def test_list_profissionais_filter_empty(test_client):
    client, async_session = test_client
    async with async_session() as session:
        await _create_profissional(session, "prof_filter_empty@example.com", cargo="Medico")
        user = await _create_user(session, "user_filter_empty@example.com")
        headers = _auth_headers(user)

    response = await client.get(
        "/api/agendamentos/profissionais",
        params={"cargo": "NaoExiste"},
        headers=headers
    )
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_list_especialidades_distinct(test_client):
    client, async_session = test_client
    async with async_session() as session:
        await _create_profissional(session, "prof_spec1@example.com", cargo="Medico")
        await _create_profissional(session, "prof_spec2@example.com", cargo="Medico")
        user = await _create_user(session, "user_spec@example.com")
        headers = _auth_headers(user)

    response = await client.get("/api/agendamentos/especialidades", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data.count("Medico") == 1


@pytest.mark.asyncio
async def test_meus_agendamentos_order_desc(test_client):
    client, async_session = test_client
    async with async_session() as session:
        prof = await _create_profissional(session, "prof_hist_order@example.com", cargo="Medico")
        owner = await _create_user(session, "owner_hist_order@example.com")
        older = Agendamento(
            paciente_id=owner.id,
            profissional_id=prof.id,
            data_hora=datetime.now(timezone.utc) + timedelta(days=1),
            status=StatusAgendamento.AGENDADO,
        )
        newer = Agendamento(
            paciente_id=owner.id,
            profissional_id=prof.id,
            data_hora=datetime.now(timezone.utc) + timedelta(days=3),
            status=StatusAgendamento.AGENDADO,
        )
        session.add_all([older, newer])
        await session.commit()
        headers = _auth_headers(owner)

    response = await client.get("/api/agendamentos/meus", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["data_hora"] >= data[1]["data_hora"]


@pytest.mark.asyncio
async def test_meus_agendamentos_includes_profissional_name(test_client):
    client, async_session = test_client
    async with async_session() as session:
        prof = await _create_profissional(session, "prof_hist_name@example.com", cargo="Medico")
        owner = await _create_user(session, "owner_hist_name@example.com")
        agendamento = Agendamento(
            paciente_id=owner.id,
            profissional_id=prof.id,
            data_hora=datetime.now(timezone.utc) + timedelta(days=2),
            status=StatusAgendamento.AGENDADO,
        )
        session.add(agendamento)
        await session.commit()
        headers = _auth_headers(owner)

    response = await client.get("/api/agendamentos/meus", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data[0]["nome_profissional"] is not None


@pytest.mark.asyncio
async def test_meus_agendamentos_empty(test_client):
    client, async_session = test_client
    async with async_session() as session:
        user = await _create_user(session, "user_hist_empty@example.com")
        headers = _auth_headers(user)

    response = await client.get("/api/agendamentos/meus", headers=headers)
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_profissionais_requires_auth(test_client):
    client, _ = test_client
    response = await client.get("/api/agendamentos/profissionais")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_especialidades_requires_auth(test_client):
    client, _ = test_client
    response = await client.get("/api/agendamentos/especialidades")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_agendamento_requires_auth(test_client):
    client, _ = test_client
    payload = {
        "profissional_id": 1,
        "data_hora": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
    }
    response = await client.post("/api/agendamentos", json=payload)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_profissionais_filter_by_cargo(test_client):
    client, async_session = test_client
    async with async_session() as session:
        await _create_profissional(session, "prof_filter1@example.com", cargo="Medico")
        await _create_profissional(session, "prof_filter2@example.com", cargo="Dentista")
        user = await _create_user(session, "user_filter@example.com")
        headers = _auth_headers(user)

    response = await client.get(
        "/api/agendamentos/profissionais",
        params={"cargo": "Medico"},
        headers=headers
    )
    assert response.status_code == 200
    data = response.json()
    assert all(item["cargo"] == "Medico" for item in data)


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
