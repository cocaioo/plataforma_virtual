# Plataforma Virtual - Gestão de UBS

Este projeto é uma plataforma para gestão e diagnóstico de Unidades Básicas de Saúde (UBS), permitindo a coleta de dados situacionais, solicitações profissionais e agendamentos.

## 🚀 Como Executar o Projeto Localmente

Siga os passos abaixo para configurar o ambiente de desenvolvimento em sua máquina.

### 📋 Pré-requisitos

Antes de começar, você precisará ter instalado:
- [Python 3.10+](https://www.python.org/downloads/)
- [Node.js (LTS)](https://nodejs.org/)
- [Git](https://git-scm.com/)

---

### 🔧 1. Configuração do Backend (API)

O backend é construído com FastAPI e utiliza SQLite por padrão para desenvolvimento local.

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/cocaioo/plataforma_virtual.git
    cd plataforma_virtual
    ```

2.  **Crie e ative um ambiente virtual:**
    *   **Windows:**
        ```bash
        python -m venv venv
        .\venv\Scripts\activate
        ```
    *   **Linux/Mac:**
        ```bash
        python3 -m venv venv
        source venv/bin/activate
        ```

3.  **Instale as dependências:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Inicialize o Banco de Dados:**
    Este comando criará o arquivo `dev.db` (SQLite) e populará as tabelas iniciais.
    ```bash
    python scripts/creates/create_tables.py
    ```

5.  **Inicie o servidor:**
    ```bash
    uvicorn main:app --reload
    ```
    A API estará disponível em `http://localhost:8000`.
    Você pode acessar a documentação interativa (Swagger) em `http://localhost:8000/docs`.

---

### 💻 2. Configuração do Frontend (React)

O frontend é construído com React + Vite.

1.  **Navegue até a pasta do frontend:**
    ```bash
    cd frontend-react
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Inicie o servidor de desenvolvimento:**
    ```bash
    npm run dev
    ```
    O frontend estará disponível em `http://localhost:5173`.

---

### 📦 3. Build de Produção (Opcional)

Se desejar rodar o projeto de forma integrada (o servidor FastAPI servindo o frontend já compilado):

1.  **Gere o build do frontend:**
    ```bash
    cd frontend-react
    npm run build
    ```
2.  **O FastAPI servirá os arquivos estáticos:**
    Certifique-se de que a pasta `frontend-react/dist` existe. O backend irá servir o app na rota raiz `/`.

---

## 🔑 Primeiro Acesso e Usuário Gestor

Por padrão, novos usuários registrados via interface recebem a role `USER`. Para acessar as funcionalidades de gestão, é necessário um usuário com role `GESTOR`. Existem duas formas de obter este acesso em ambiente de desenvolvimento:

### Opção A: Usando o script automatizado (Recomendado)
Este script cria um usuário administrador padrão ou promove um usuário existente (caso você já tenha se registrado pelo frontend).

1. Execute o script na raiz do projeto:
   ```bash
    python scripts/creates/create_admin.py
   ```
2. O usuário padrão será:
   - **Login:** `admin@example.com`
   - **Senha:** `Password123`

### Opção B: Via SQL (Manual)
Se preferir usar seu próprio cadastro feito pelo frontend:

1. Registre-se normalmente.
2. Acesse o banco de dados SQLite (`dev.db`) usando uma ferramenta como [DBeaver](https://dbeaver.io/) ou o comando `sqlite3`.
3. Execute o seguinte SQL:
   ```sql
   UPDATE usuarios SET role = 'GESTOR' WHERE email = 'seu-email@exemplo.com';
   ```

## 🛠️ Estrutura do Projeto

- `app/`: Backend FastAPI (API, modelos, schemas, services e utils).
- `main.py`: Entry point que expõe `app` do backend.
- `scripts/`: Scripts auxiliares (seed, criação de usuários, inspeção).
- `docs/`: Documentação técnica e scripts SQL.
- `frontend-react/`: Código fonte da aplicação web.
- `alembic/`: Migrações do banco de dados (usado principalmente em produção).

## 📝 Notas Importantes

- **Usuários de Teste (Seed Data):** Para facilitar a validação das permissões (RBAC) em ambiente de teste ou produção, você pode utilizar os seguintes usuários padrão (Senha única: `Plataforma123`):
  - **Paciente (USER):** `teste.paciente@plataforma.com`
  - **Gestor (GESTOR):** `teste.gestor@plataforma.com`
  - **Recepção (RECEPCAO):** `recepcao@plataforma.com`
- **Banco de Dados:** Por padrão, o projeto usa SQLite localmente. Para usar PostgreSQL, configure a variável de ambiente `DATABASE_URL` no arquivo `.env`.
- **CORS:** A API está configurada para aceitar requisições de `http://localhost:5173` por padrão.
- **Relatórios:** A geração de relatórios PDF utiliza a biblioteca `reportlab`.

