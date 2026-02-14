import sqlite3
import os
from passlib.context import CryptContext

# Mesmo esquema de criptografia usado no auth_routes.py
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

db_path = "dev.db"

if not os.path.exists(db_path):
    print(f"Erro: O arquivo {db_path} não existe. Execute 'python create_tables.py' primeiro.")
    exit(1)

# Dados do usuário administrativo
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "Password123"
ADMIN_NOME = "Administrador Local"
ADMIN_CPF = "11144477735" # CPF válido para testes

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # Verifica se o usuário já existe
    cursor.execute("SELECT id, role FROM usuarios WHERE email = ?", (ADMIN_EMAIL,))
    user = cursor.fetchone()
    
    if user:
        user_id, current_role = user
        if current_role != "GESTOR":
            cursor.execute("UPDATE usuarios SET role = 'GESTOR' WHERE id = ?", (user_id,))
            conn.commit()
            print(f"✔ Usuário {ADMIN_EMAIL} já existia e foi promovido a GESTOR!")
        else:
            print(f"ℹ Usuário {ADMIN_EMAIL} já é um GESTOR.")
    else:
        # Insere o usuário diretamente como GESTOR
        hashed_pwd = hash_password(ADMIN_PASSWORD)
        cursor.execute(
            "INSERT INTO usuarios (nome, email, senha, cpf, role, ativo, tentativas_login, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))",
            (ADMIN_NOME, ADMIN_EMAIL, hashed_pwd, ADMIN_CPF, "GESTOR", 1, 0)
        )
        conn.commit()
        print(f"✔ Novo usuário GESTOR criado com sucesso!")
    
    print(f"Login: {ADMIN_EMAIL}")
    print(f"Senha: {ADMIN_PASSWORD}")
    print(f"Role: GESTOR")

except Exception as e:
    print(f"Erro ao criar usuário: {e}")
finally:
    conn.close()
