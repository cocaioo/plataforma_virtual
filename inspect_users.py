import sqlite3
import os

db_path = "dev.db"

if not os.path.exists(db_path):
    print(f"Banco de dados '{db_path}' não encontrado.")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("SELECT count(*) FROM usuarios")
    count = cursor.fetchone()[0]
    print(f"Total de usuários encontrados: {count}")

    if count > 0:
        print("\nUsuários existentes (ID | Nome | Email | Role | Ativo):")
        print("-" * 60)
        cursor.execute("SELECT id, nome, email, role, ativo FROM usuarios")
        for row in cursor.fetchall():
            print(f"{row[0]} | {row[1]} | {row[2]} | {row[3]} | {row[4]}")
        print("-" * 60)
    else:
        print("\nNenhum usuário encontrado no banco de dados.")

except sqlite3.OperationalError as e:
    print(f"Erro ao acessar tabela 'usuarios': {e}")
    print("Talvez você precise rodar 'python create_tables.py' novamente se o banco estiver vazio ou corrompido.")

finally:
    conn.close()
