import pytest
from datetime import datetime, timezone

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from main import app
from database import Base, get_db
from models.auth_models import Usuario
from utils.jwt_handler import create_access_token


async def _create_user(session: AsyncSession, email: str, role: str) -> Usuario:
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
async def test_materiais_blocked_for_user(test_client):
    client, async_session = test_client
    async with async_session() as session:
        gestor = await _create_user(session, "gestor_materiais@example.com", role="GESTOR")
        user = await _create_user(session, "user_materiais@example.com", role="USER")
        gestor_headers = _auth_headers(gestor)
        user_headers = _auth_headers(user)

    ubs_id = await _create_ubs(client, gestor_headers)
    response = await client.get(f"/api/materiais?ubs_id={ubs_id}", headers=user_headers)
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_materiais_crud_with_file(test_client):
    client, async_session = test_client
    async with async_session() as session:
        prof = await _create_user(session, "prof_materiais@example.com", role="PROFISSIONAL")
        headers = _auth_headers(prof)

    ubs_id = await _create_ubs(client, headers)
    create_payload = {
        "ubs_id": str(ubs_id),
        "titulo": "PNAB 2024",
        "descricao": "Documento oficial",
        "categoria": "PNAB",
        "publico_alvo": "Equipe",
        "ativo": "true",
    }
    create_files = {"file": ("pnab.txt", b"conteudo", "text/plain")}
    create_response = await client.post(
        "/api/materiais",
        data=create_payload,
        files=create_files,
        headers=headers,
    )
    assert create_response.status_code == 201
    material = create_response.json()
    material_id = material["id"]
    assert material["files"]
    file_id = material["files"][0]["id"]

    list_response = await client.get(f"/api/materiais?ubs_id={ubs_id}", headers=headers)
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1

    download_response = await client.get(
        f"/api/materiais/files/{file_id}/download",
        headers=headers,
    )
    assert download_response.status_code == 200

    delete_file_response = await client.delete(
        f"/api/materiais/files/{file_id}",
        headers=headers,
    )
    assert delete_file_response.status_code == 204

    delete_material_response = await client.delete(
        f"/api/materiais/{material_id}",
        headers=headers,
    )
    assert delete_material_response.status_code == 204


@pytest.mark.asyncio
async def test_cronograma_blocked_for_user(test_client):
    client, async_session = test_client
    async with async_session() as session:
        gestor = await _create_user(session, "gestor_crono@example.com", role="GESTOR")
        user = await _create_user(session, "user_crono@example.com", role="USER")
        gestor_headers = _auth_headers(gestor)
        user_headers = _auth_headers(user)

    ubs_id = await _create_ubs(client, gestor_headers)

    create_payload = {
        "ubs_id": ubs_id,
        "titulo": "Sala de vacina",
        "tipo": "SALA_VACINA",
        "inicio": datetime.now(timezone.utc).isoformat(),
        "dia_inteiro": False,
        "recorrencia": "NONE",
        "recorrencia_intervalo": 1,
    }
    create_response = await client.post("/api/cronograma", json=create_payload, headers=gestor_headers)
    assert create_response.status_code == 201

    list_response = await client.get(f"/api/cronograma?ubs_id={ubs_id}", headers=gestor_headers)
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1

    blocked_response = await client.get(f"/api/cronograma?ubs_id={ubs_id}", headers=user_headers)
    assert blocked_response.status_code == 403
