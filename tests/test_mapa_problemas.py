import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from main import app
from database import Base, get_db
from models.auth_models import Usuario
from utils.jwt_handler import create_access_token


async def _create_user(session: AsyncSession, email: str, role: str = "PROFISSIONAL") -> Usuario:
    user = Usuario(
        nome="Usuario Teste",
        email=email,
        senha="hashed",
        cpf=str(abs(hash(email)) % 10**11).zfill(11),
        role=role,
        ativo=True,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


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


async def _create_ubs(client: AsyncClient, headers: dict) -> int:
    payload = {
        "nome_ubs": "UBS Centro",
        "cnes": "1234567",
        "area_atuacao": "Centro",
    }
    response = await client.post("/api/ubs", json=payload, headers=headers)
    assert response.status_code == 201
    return response.json()["id"]


@pytest.mark.asyncio
async def test_create_problem_calculates_gut_score(test_client):
    client, async_session = test_client
    async with async_session() as session:
        user = await _create_user(session, "prof_gut@example.com")
        headers = _auth_headers(user)

    ubs_id = await _create_ubs(client, headers)
    payload = {
        "titulo": "Falta de insumos",
        "descricao": "Medicamentos em falta",
        "gut_gravidade": 2,
        "gut_urgencia": 3,
        "gut_tendencia": 4,
        "is_prioritario": True,
    }
    response = await client.post(f"/api/ubs/{ubs_id}/problems", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["gut_score"] == 24

    list_response = await client.get(f"/api/ubs/{ubs_id}/problems", headers=headers)
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1


@pytest.mark.asyncio
async def test_update_problem_recalculates_score(test_client):
    client, async_session = test_client
    async with async_session() as session:
        user = await _create_user(session, "prof_update@example.com")
        headers = _auth_headers(user)

    ubs_id = await _create_ubs(client, headers)
    create_payload = {
        "titulo": "Baixa cobertura vacinal",
        "descricao": "Abaixo da meta",
        "gut_gravidade": 1,
        "gut_urgencia": 1,
        "gut_tendencia": 2,
        "is_prioritario": False,
    }
    create_response = await client.post(
        f"/api/ubs/{ubs_id}/problems",
        json=create_payload,
        headers=headers,
    )
    assert create_response.status_code == 201
    problem_id = create_response.json()["id"]

    update_payload = {
        "gut_gravidade": 3,
        "gut_urgencia": 4,
        "gut_tendencia": 5,
    }
    update_response = await client.patch(
        f"/api/ubs/problems/{problem_id}",
        json=update_payload,
        headers=headers,
    )
    assert update_response.status_code == 200
    assert update_response.json()["gut_score"] == 60


@pytest.mark.asyncio
async def test_intervention_action_flow(test_client):
    client, async_session = test_client
    async with async_session() as session:
        user = await _create_user(session, "prof_interv@example.com")
        headers = _auth_headers(user)

    ubs_id = await _create_ubs(client, headers)
    problem_payload = {
        "titulo": "Fila de espera",
        "descricao": "Agendamento congestionado",
        "gut_gravidade": 3,
        "gut_urgencia": 3,
        "gut_tendencia": 3,
        "is_prioritario": True,
    }
    problem_response = await client.post(
        f"/api/ubs/{ubs_id}/problems",
        json=problem_payload,
        headers=headers,
    )
    assert problem_response.status_code == 201
    problem_id = problem_response.json()["id"]

    intervention_payload = {
        "objetivo": "Reduzir a fila",
        "metas": "Diminuir em 30%",
        "responsavel": "Coordenacao",
        "status": "PLANEJADO",
    }
    intervention_response = await client.post(
        f"/api/ubs/problems/{problem_id}/interventions",
        json=intervention_payload,
        headers=headers,
    )
    assert intervention_response.status_code == 201
    intervention_id = intervention_response.json()["id"]

    action_payload = {
        "acao": "Revisar agenda",
        "prazo": "2030-01-01",
        "status": "EM_ANDAMENTO",
        "observacoes": "Priorizar gestantes",
    }
    action_response = await client.post(
        f"/api/ubs/interventions/{intervention_id}/actions",
        json=action_payload,
        headers=headers,
    )
    assert action_response.status_code == 201
    action_data = action_response.json()
    assert action_data["status"] == "EM_ANDAMENTO"

    list_response = await client.get(
        f"/api/ubs/interventions/{intervention_id}/actions",
        headers=headers,
    )
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1
