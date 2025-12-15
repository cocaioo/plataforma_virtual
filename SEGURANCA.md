# Medidas de Segurança Implementadas

## Validações de Entrada

### Backend (FastAPI)

#### Validação de Nome
- Mínimo 2 caracteres, máximo 100
- Apenas letras (incluindo acentuação)
- Remove espaços extras

#### Validação de Email
- Formato válido usando `EmailStr` do Pydantic
- Verificação de duplicidade no banco

#### Validação de CPF
- Exatamente 11 dígitos
- Rejeita CPFs com todos os dígitos iguais (ex: 111.111.111-11)
- **✅ Validação completa com dígitos verificadores**
- Verificação de duplicidade no banco

#### Validação de Senha
- Mínimo 8 caracteres
- Pelo menos 1 letra maiúscula
- Pelo menos 1 letra minúscula
- Pelo menos 1 número
- Hash usando bcrypt (via passlib)

### Frontend (React)

#### Validação de Nome
- Mínimo 2 caracteres
- Apenas letras e espaços

#### Validação de Email
- Formato válido usando regex

#### Validação de CPF
- 11 dígitos numéricos
- Rejeita CPFs inválidos (todos dígitos iguais)
- **✅ Validação completa com dígitos verificadores**

#### Validação de Senha
- Mínimo 8 caracteres
- Pelo menos 1 letra maiúscula
- Pelo menos 1 letra minúscula
- Pelo menos 1 número
- Confirmação de senha obrigatória

## Proteção contra Ataques

### SQL Injection
- **Backend**: Uso de SQLAlchemy ORM com queries parametrizadas
- **Frontend**: Detecção de padrões suspeitos (union, select, insert, update, delete, drop, --, /*, */, xp_)

### XSS (Cross-Site Scripting)
- **Frontend**: Detecção de padrões suspeitos (<script, <iframe, javascript:, onerror=, onload=)
- **React**: Sanitização automática de inputs pelo React

### CORS
- Configurado para aceitar apenas origens específicas (localhost:5173, 127.0.0.1:5173)
- Credenciais permitidas apenas para origens autorizadas

### Senhas
- Hash usando bcrypt (custo computacional alto)
- Senhas nunca armazenadas em texto plano
- Senhas nunca retornadas nas respostas da API

## ✅ Recursos de Segurança Avançados Implementados

### 1. Rate Limiting (Limite de Requisições por IP)
- **Biblioteca**: SlowAPI
- **Configuração**:
  - `/health`: 10 requisições por minuto
  - `/auth/register`: 5 requisições por minuto
  - `/auth/login`: 10 requisições por minuto
  - `/auth/profissional`: 5 requisições por minuto
- **Proteção**: Previne ataques de força bruta e DDoS
- **Resposta**: HTTP 429 (Too Many Requests) quando limite excedido

### 2. JWT Tokens para Sessões
- **Biblioteca**: python-jose
- **Algoritmo**: HS256
- **Expiração**: 60 minutos (configurável via `JWT_EXPIRE_MINUTES`)
- **Payload**: Contém `user_id`, `email`, `is_profissional`
- **Armazenamento Frontend**: localStorage
- **Auto-logout**: Token expirado redireciona para login
- **Formato**: Bearer token no header Authorization

### 3. Logs de Tentativas de Login
- **Tabela**: `login_attempts`
- **Informações registradas**:
  - Email do usuário
  - Endereço IP
  - Sucesso/Falha
  - Motivo (usuário não encontrado, senha incorreta, conta bloqueada, etc.)
  - Timestamp
- **Uso**: Auditoria e análise de segurança

### 4. Bloqueio de Conta após Múltiplas Tentativas Falhas
- **Limite**: 5 tentativas falhas
- **Duração do bloqueio**: 15 minutos
- **Comportamento**:
  - Contador de tentativas incrementa a cada falha
  - Após 5 falhas, conta é bloqueada temporariamente
  - Usuário recebe mensagem com tempo restante
  - Bloqueio é automaticamente removido após o período
  - Contador é resetado após login bem-sucedido
- **Campos no banco**:
  - `tentativas_login`: Contador de tentativas
  - `bloqueado_ate`: Timestamp do fim do bloqueio

### 5. Validação Completa de CPF
- **Backend**: `utils/cpf_validator.py`
- **Frontend**: `utils/validation.js`
- **Validações**:
  - 11 dígitos numéricos
  - Rejeita sequências repetidas (111.111.111-11)
  - **Calcula e valida primeiro dígito verificador**
  - **Calcula e valida segundo dígito verificador**
- **Algoritmo**: Implementação completa do algoritmo oficial de validação de CPF

## Boas Práticas

### Autenticação
- Mensagens de erro genéricas para login ("Email ou senha incorretos")
- Verificação de usuário ativo antes de permitir login
- Verificação de duplicidade de email e CPF no cadastro
- Tokens JWT com expiração configurável
- Logout limpa token do localStorage

### Banco de Dados
- Conexões assíncronas com pool de conexões
- Transações automáticas com commit/rollback
- Índices únicos em email e CPF
- Tabela de auditoria para tentativas de login

### API
- Status codes HTTP apropriados (201, 400, 401, 403, 404, 429)
- Validação de dados com Pydantic
- Respostas padronizadas
- Rate limiting por endpoint
- Logs estruturados

## Estrutura de Arquivos de Segurança

```
plataforma_digital/
├── utils/
│   ├── jwt_handler.py          # Criação e verificação de JWT tokens
│   └── cpf_validator.py        # Validação completa de CPF
├── models/
│   └── auth_models.py          # Modelos com campos de segurança
│       ├── Usuario (tentativas_login, bloqueado_ate)
│       └── LoginAttempt (logs de tentativas)
└── routes/
    └── auth_routes.py          # Rotas com rate limiting e validações
```

## Configuração Necessária

### Variáveis de Ambiente (.env)

```env
# Database
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=plataforma_digital

# JWT
JWT_SECRET_KEY=your-super-secret-key-change-this-in-production
JWT_EXPIRE_MINUTES=60
```

### Instalação de Dependências

```bash
pip install -r requirements.txt
```

**Novas dependências adicionadas:**
- `python-jose[cryptography]==3.3.0` - JWT tokens
- `slowapi==0.1.9` - Rate limiting

## O que NÃO está implementado (futuro)

- ❌ Autenticação de dois fatores (2FA) - Requer integração com SMS/TOTP
- ❌ HTTPS - Deve ser configurado no servidor de produção (Nginx/Apache)
- ⚠️ Refresh tokens - Atualmente apenas access tokens
- ⚠️ Blacklist de tokens - Tokens revogados não são rastreados
- ⚠️ Proteção CSRF - Necessário para formulários tradicionais
- ⚠️ Rate limiting distribuído - Atual é por instância (usar Redis para múltiplas instâncias)

## Recomendações para Produção

1. **Alterar JWT_SECRET_KEY** para uma chave forte e única
2. **Configurar HTTPS** no servidor web (Nginx/Apache)
3. **Usar Redis** para rate limiting distribuído
4. **Implementar refresh tokens** para melhor UX
5. **Configurar logs centralizados** (ELK Stack, Datadog, etc.)
6. **Monitorar tentativas de login** e criar alertas
7. **Backup regular** da tabela `login_attempts`
8. **Revisar rate limits** baseado no uso real
