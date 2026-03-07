import json
import os
import random
import re
import string

from dotenv import load_dotenv
from passlib.context import CryptContext
from sqlalchemy import create_engine, text, inspect

FIRST_NAMES = [
    "Maria", "Jose", "Ana", "Joao", "Francisca", "Carlos", "Paulo", "Mariana",
    "Rita", "Luciana", "Ricardo", "Patricia", "Bruno", "Fernanda", "Raimundo",
    "Camila", "Tiago", "Aline", "Rosa", "Juliana", "Guilherme", "Beatriz",
    "Felipe", "Carla", "Roberto", "Sara", "Leandro", "Larissa", "Edson", "Viviane"
]

LAST_NAMES = [
    "Silva", "Souza", "Costa", "Oliveira", "Santos", "Pereira", "Rodrigues",
    "Almeida", "Nunes", "Lima", "Carvalho", "Gomes", "Martins", "Araujo",
    "Barbosa", "Ribeiro", "Moura", "Ferreira", "Cardoso", "Teixeira"
]

def generate_cpf():
    nums = [random.randint(0, 9) for _ in range(9)]
    def calc_digit(n):
        s = sum([v * (n + 1 - i) for i, v in enumerate(nums)])
        r = (s * 10) % 11
        return 0 if r == 10 else r
    d1 = calc_digit(9)
    nums.append(d1)
    def calc_digit2(n):
        s = sum([v * (n + 1 - i) for i, v in enumerate(nums)])
        r = (s * 10) % 11
        return 0 if r == 10 else r
    d2 = calc_digit2(10)
    nums.append(d2)
    return f"{nums[0]}{nums[1]}{nums[2]}.{nums[3]}{nums[4]}{nums[5]}.{nums[6]}{nums[7]}{nums[8]}-{nums[9]}{nums[10]}"

def generate_password():
    chars = string.ascii_letters + string.digits
    while True:
        pwd = "".join(random.choice(chars) for _ in range(10))
        if (any(c.islower() for c in pwd)
                and any(c.isupper() for c in pwd)
                and any(c.isdigit() for c in pwd)):
            return pwd

def generate_unique_email(name, used_emails):
    base = name.lower().replace(" ", ".")
    email = f"{base}.acs@plataforma.com"
    if email not in used_emails:
        used_emails.add(email)
        return email
    i = 2
    while True:
        email = f"{base}{i}.acs@plataforma.com"
        if email not in used_emails:
            used_emails.add(email)
            return email
        i += 1

def generate_acs(count=20):
    used_cpfs = set()
    used_emails = set()
    result = []
    for _ in range(count):
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        last2 = random.choice(LAST_NAMES)
        name = f"{first} {last} {last2}"
        email = generate_unique_email(name, used_emails)

        cpf = generate_cpf()
        while cpf in used_cpfs:
            cpf = generate_cpf()
        used_cpfs.add(cpf)

        result.append({
            "nome": name,
            "email": email,
            "cpf": cpf,
            "senha": generate_password()
        })
    return result


def _normalize_database_url(url: str) -> str:
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg://", 1)
    if url.startswith("postgresql://") and "+psycopg" not in url:
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    if url.startswith("sqlite+aiosqlite:///"):
        return url.replace("sqlite+aiosqlite:///", "sqlite:///", 1)
    return url


def _build_database_url_from_parts() -> str | None:
    database_user = os.getenv("DB_USER")
    database_password = os.getenv("DB_PASSWORD")
    database_host = os.getenv("DB_HOST")
    database_port = os.getenv("DB_PORT")
    database_name = os.getenv("DB_NAME")

    if not all([database_user, database_password, database_host, database_port, database_name]):
        return None

    return (
        f"postgresql+psycopg://{database_user}:{database_password}"
        f"@{database_host}:{database_port}/{database_name}"
    )


def _resolve_sqlite_url(url: str, base_dir: str) -> str:
    if not url.startswith("sqlite:///"):
        return url

    path = url.replace("sqlite:///", "", 1)
    if os.path.isabs(path):
        return url

    absolute_path = os.path.abspath(os.path.join(base_dir, path))
    return f"sqlite:///{absolute_path}"


def get_database_url() -> str:
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    env_path = os.path.join(base_dir, ".env")
    load_dotenv(env_path)

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        database_url = _build_database_url_from_parts()
    if not database_url:
        database_url = "sqlite:///dev.db"

    database_url = _normalize_database_url(database_url)
    database_url = _resolve_sqlite_url(database_url, base_dir)
    return database_url


def normalize_cpf(value: str) -> str:
    return re.sub(r"\D", "", value or "")


def insert_acs_users(acs_list):
    db_url = get_database_url()
    engine = create_engine(db_url, future=True)
    pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

    inspector = inspect(engine)
    if "usuarios" not in inspector.get_table_names():
        raise RuntimeError(
            "Tabela 'usuarios' nao encontrada. "
            "Confirme o banco correto e rode 'python create_tables.py' ou as migracoes. "
            f"DATABASE_URL efetiva: {db_url}"
        )

    created_users = 0
    created_agents = 0
    skipped = 0

    with engine.begin() as conn:
        for acs in acs_list:
            cpf = normalize_cpf(acs["cpf"])
            email = acs["email"].strip().lower()
            nome = acs["nome"].strip()
            senha = acs["senha"]

            exists = conn.execute(
                text("SELECT id FROM usuarios WHERE email = :email OR cpf = :cpf"),
                {"email": email, "cpf": cpf},
            ).fetchone()
            if exists:
                skipped += 1
                continue

            hashed_pwd = pwd_context.hash(senha)
            conn.execute(
                text(
                    """
                    INSERT INTO usuarios (nome, email, senha, cpf, role, ativo, tentativas_login, created_at)
                    VALUES (:nome, :email, :senha, :cpf, 'ACS', 1, 0, CURRENT_TIMESTAMP)
                    """
                ),
                {"nome": nome, "email": email, "senha": hashed_pwd, "cpf": cpf},
            )
            created_users += 1

            user_row = conn.execute(
                text("SELECT id FROM usuarios WHERE email = :email"),
                {"email": email},
            ).fetchone()
            if not user_row:
                continue

            conn.execute(
                text(
                    """
                    INSERT INTO agentes_saude (usuario_id, microarea_id, ativo, created_at)
                    VALUES (:usuario_id, NULL, 1, CURRENT_TIMESTAMP)
                    """
                ),
                {"usuario_id": user_row[0]},
            )
            created_agents += 1

    return created_users, created_agents, skipped

if __name__ == "__main__":
    data = generate_acs(20)
    created_users, created_agents, skipped = insert_acs_users(data)
    print(json.dumps(data, ensure_ascii=True, indent=2))
    print(
        f"\nResumo: {created_users} usuarios ACS criados, "
        f"{created_agents} agentes vinculados, {skipped} ignorados (duplicados)."
    )