# Plataforma Virtual de Gestão para a APS

Protótipo de uma plataforma para apoiar a gestão da Atenção Primária à Saúde (APS), com foco em integração de dados, automação de processos e suporte à decisão clínica e administrativa.

## Stack Tecnológica

### Backend
- **FastAPI** - Framework web moderno e rápido
- **PostgreSQL 16** - Banco de dados
- **SQLAlchemy 2.0** - ORM async
- **asyncpg** - Driver PostgreSQL assíncrono
- **Python 3.13**
- **JWT** - Autenticação com tokens
- **SlowAPI** - Rate limiting

### Frontend
- **React 18**
- **Vite** - Build tool
- **React Router** - Roteamento

## Como Rodar a Aplicação

### Pré-requisitos
- Python 3.13+
- Node.js 18+
- PostgreSQL 16+ instalado localmente

### 1. Banco de Dados (PostgreSQL)

Certifique-se de que o PostgreSQL está instalado e rodando localmente.

#### Criar o banco de dados:

```bash
psql -U postgres
CREATE DATABASE plataforma_digital;
\q
```

#### Configurar variáveis de ambiente:

Copie o arquivo `.env.example` para `.env` e configure com suas credenciais locais:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
DB_USER=postgres
DB_PASSWORD=sua_senha
DB_HOST=localhost
DB_PORT=5432
DB_NAME=plataforma_digital

JWT_SECRET_KEY=sua-chave-secreta-super-forte-aqui
JWT_EXPIRE_MINUTES=60
```

**⚠️ IMPORTANTE**: Altere `JWT_SECRET_KEY` para uma chave forte e única em produção!

### 2. Backend (FastAPI)

#### Criar ambiente virtual

```bash
python -m venv venv
```

#### Ativar ambiente virtual

**Windows (PowerShell/CMD):**
```bash
venv\Scripts\activate
```

**Windows (Git Bash):**
```bash
source venv/Scripts/activate
```

**Linux/Mac:**
```bash
source venv/bin/activate
```

#### Instalar dependências

```bash
pip install -r requirements.txt
```

#### Rodar o servidor

```bash
uvicorn main:app --reload
```

O backend estará disponível em: **http://127.0.0.1:8000**

- API Docs (Swagger): http://127.0.0.1:8000/docs
- Health Check: http://127.0.0.1:8000/health

### 3. Frontend (React)

#### Instalar dependências

```bash
cd frontend-react
npm install
```

#### Rodar o servidor de desenvolvimento

```bash
npm run dev
```

O frontend estará disponível em: **http://localhost:5173**

## Estrutura do Projeto

```
plataforma_digital/
├── main.py                 # Entry point do FastAPI
├── database.py            # Configuração do banco de dados
├── requirements.txt       # Dependências Python
├── .env                   # Variáveis de ambiente (criar a partir do .env.example)
├── .env.example           # Template de variáveis de ambiente
├── SEGURANCA.md          # Documentação de segurança
├── models/               # Modelos SQLAlchemy
│   └── auth_models.py    # Usuario, ProfissionalUbs, LoginAttempt
├── routes/               # Rotas da API
│   └── auth_routes.py    # Autenticação com JWT e rate limiting
├── utils/                # Utilitários
│   ├── jwt_handler.py    # Criação e verificação de JWT
│   └── cpf_validator.py  # Validação completa de CPF
└── frontend-react/       # Aplicação React
    ├── src/
    │   ├── components/
    │   ├── pages/
    │   └── utils/
    └── package.json
```

## Recursos de Segurança

✅ **Rate Limiting** - Proteção contra força bruta e DDoS  
✅ **JWT Tokens** - Autenticação segura com sessões  
✅ **Login Attempt Logs** - Auditoria de tentativas de login  
✅ **Account Lockout** - Bloqueio após 5 tentativas falhas (15 min)  
✅ **Full CPF Validation** - Validação com dígitos verificadores  
✅ **Password Hashing** - Bcrypt com salt  
✅ **SQL Injection Protection** - ORM parametrizado  
✅ **XSS Protection** - Validação de entrada  

Veja [SEGURANCA.md](SEGURANCA.md) para detalhes completos.

## Funcionalidades Principais

- Integrar dados relevantes da rede de APS
- Automatizar processos de gestão (agenda, encaminhamentos, fluxos)
- Monitorar indicadores epidemiológicos e operacionais
- Apoiar a tomada de decisão nas Unidades Básicas de Saúde

## Objetivos do Protótipo

- Validar fluxos de gestão e visualizações úteis para equipes de APS
- Garantir rastreabilidade de dados e segurança das informações
- Facilitar o acompanhamento de metas e indicadores de saúde populacional

## Comandos Úteis

### Parar os serviços

**Backend:** `Ctrl+C` no terminal do uvicorn

**Frontend:** `Ctrl+C` no terminal do vite

### Acessar o PostgreSQL via terminal

```bash
psql -U postgres -d plataforma_digital
```

### Ver logs de tentativas de login

```sql
SELECT * FROM login_attempts ORDER BY created_at DESC LIMIT 10;
```

## Próximos Passos

- Mapear fontes de dados e padrões de integração (ex.: CNES, e-SUS)
- Desenhar telas iniciais para visualização de indicadores e fila de atendimentos
- Implementar dashboard protegido com autenticação JWT
- Adicionar refresh tokens para melhor UX
- Configurar HTTPS para produção
