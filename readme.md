# Plataforma Virtual de Gestão para a APS

Protótipo de uma plataforma para apoiar a gestão da Atenção Primária à Saúde (APS), com foco em integração de dados, automação de processos e suporte à decisão clínica e administrativa.

## Stack Tecnológica

### Backend
- **FastAPI** - Framework web moderno e rápido
- **PostgreSQL 16** - Banco de dados
- **SQLAlchemy 2.0** - ORM async
- **asyncpg** - Driver PostgreSQL assíncrono
- **Python 3.13**

### Frontend
- **React 18**
- **Vite** - Build tool
- **React Router** - Roteamento

## Como Rodar a Aplicação

### Pré-requisitos
- Python 3.13+
- Node.js 18+
- Docker e Docker Compose

### 1. Banco de Dados (PostgreSQL)

Inicie o container do PostgreSQL:

```bash
docker-compose up -d
```

Para verificar se está rodando:

```bash
docker ps
```

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
├── docker-compose.yml     # Configuração do PostgreSQL
├── .env                   # Variáveis de ambiente
├── models/               # Modelos SQLAlchemy
│   └── auth_models.py
├── routes/               # Rotas da API
│   └── auth_routes.py
└── frontend-react/       # Aplicação React
    ├── src/
    │   ├── components/
    │   ├── pages/
    │   └── utils/
    └── package.json
```

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

**Docker:** 
```bash
docker-compose down
```

### Ver logs do banco de dados

```bash
docker logs meu-postgres
```

### Acessar o PostgreSQL via terminal

```bash
docker exec -it meu-postgres psql -U admin -d my_db
```

## Próximos Passos

- Mapear fontes de dados e padrões de integração (ex.: CNES, e-SUS)
- Desenhar telas iniciais para visualização de indicadores e fila de atendimentos
- Definir métricas mínimas para pilotagem e coleta de feedback
