# Scripts de Banco de Dados - Plataforma Virtual

Este documento contém os scripts SQL das tabelas já existentes no Supabase e os scripts para criar as novas tabelas e atualizar as existentes, conforme o estado atual do código (SQLAlchemy).

## 1. Tabelas Atuais (Já existentes no Supabase)

Estes são os scripts das tabelas que já foram criadas. Nenhuma ação é necessária para estas, **exceto** para a tabela `usuarios` que precisa de atualização (ver seção 2).

```sql
create table public.alembic_version (
  version_num character varying(32) not null,
  constraint alembic_version_pkc primary key (version_num)
) TABLESPACE pg_default;

create table public.indicators (
  id serial not null,
  ubs_id integer not null,
  nome_indicador character varying(255) not null,
  valor numeric(18, 4) not null,
  meta numeric(18, 4) null,
  tipo_valor character varying(40) null default 'PERCENTUAL',
  periodo_referencia character varying(100) not null,
  observacoes text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null,
  created_by integer null,
  updated_by integer null,
  constraint indicators_pkey primary key (id),
  constraint indicators_created_by_fkey foreign KEY (created_by) references usuarios (id),
  constraint indicators_ubs_id_fkey foreign KEY (ubs_id) references ubs (id) on delete CASCADE,
  constraint indicators_updated_by_fkey foreign KEY (updated_by) references usuarios (id)
) TABLESPACE pg_default;

create table public.login_attempts (
  id serial not null,
  email character varying(200) not null,
  ip_address character varying(45) null,
  sucesso boolean not null,
  motivo character varying(255) null,
  created_at timestamp with time zone null default now(),
  constraint login_attempts_pkey primary key (id)
) TABLESPACE pg_default;

create table public.professional_groups (
  id serial not null,
  ubs_id integer not null,
  cargo_funcao character varying(255) not null,
  quantidade integer not null,
  tipo_vinculo character varying(50) null,
  observacoes text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null,
  created_by integer null,
  updated_by integer null,
  constraint professional_groups_pkey primary key (id),
  constraint professional_groups_created_by_fkey foreign KEY (created_by) references usuarios (id),
  constraint professional_groups_ubs_id_fkey foreign KEY (ubs_id) references ubs (id) on delete CASCADE,
  constraint professional_groups_updated_by_fkey foreign KEY (updated_by) references usuarios (id)
) TABLESPACE pg_default;

create table public.profissionais (
  id serial not null,
  usuario_id integer not null,
  cargo character varying(100) not null,
  registro_professional character varying(50) not null,
  ativo boolean not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null,
  constraint profissionais_pkey primary key (id),
  constraint profissionais_registro_professional_key unique (registro_professional),
  constraint profissionais_usuario_id_fkey foreign KEY (usuario_id) references usuarios (id)
) TABLESPACE pg_default;

create table public.services (
  id serial not null,
  name character varying(255) not null,
  created_at timestamp with time zone null default now(),
  constraint services_pkey primary key (id),
  constraint services_name_key unique (name)
) TABLESPACE pg_default;

create table public.territory_profiles (
  id serial not null,
  ubs_id integer not null,
  descricao_territorio text not null,
  potencialidades_territorio text null,
  riscos_vulnerabilidades text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null,
  created_by integer null,
  updated_by integer null,
  constraint territory_profiles_pkey primary key (id),
  constraint territory_profiles_ubs_id_key unique (ubs_id),
  constraint territory_profiles_created_by_fkey foreign KEY (created_by) references usuarios (id),
  constraint territory_profiles_ubs_id_fkey foreign KEY (ubs_id) references ubs (id) on delete CASCADE,
  constraint territory_profiles_updated_by_fkey foreign KEY (updated_by) references usuarios (id)
) TABLESPACE pg_default;

create table public.ubs (
  id serial not null,
  tenant_id integer not null,
  owner_user_id integer not null,
  nome_ubs character varying(255) not null,
  nome_relatorio character varying(255) null,
  cnes character varying(32) not null,
  area_atuacao text not null,
  numero_habitantes_ativos integer not null,
  numero_microareas integer not null,
  numero_familias_cadastradas integer not null,
  numero_domicilios integer not null,
  domicilios_rurais integer null,
  data_inauguracao date null,
  data_ultima_reforma date null,
  descritivos_gerais text null,
  observacoes_gerais text null,
  outros_servicos text null,
  periodo_referencia character varying(50) null,
  identificacao_equipe character varying(100) null,
  responsavel_nome character varying(255) null,
  responsavel_cargo character varying(255) null,
  responsavel_contato character varying(255) null,
  fluxo_agenda_acesso text null,
  status character varying(20) not null,
  submitted_at timestamp with time zone null,
  submitted_by integer null,
  is_deleted boolean not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null,
  constraint ubs_pkey primary key (id),
  constraint ubs_owner_user_id_fkey foreign KEY (owner_user_id) references usuarios (id),
  constraint ubs_submitted_by_fkey foreign KEY (submitted_by) references usuarios (id)
) TABLESPACE pg_default;

create table public.ubs_attachments (
  id serial not null,
  ubs_id integer not null,
  original_filename character varying(255) not null,
  content_type character varying(100) null,
  size_bytes integer not null,
  storage_path text not null,
  section character varying(50) null,
  description text null,
  created_at timestamp with time zone null default now(),
  constraint ubs_attachments_pkey primary key (id),
  constraint ubs_attachments_ubs_id_fkey foreign KEY (ubs_id) references ubs (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.ubs_needs (
  id serial not null,
  ubs_id integer not null,
  problemas_identificados text not null,
  necessidades_equipamentos_insumos text null,
  necessidades_especificas_acs text null,
  necessidades_infraestrutura_manutencao text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null,
  created_by integer null,
  updated_by integer null,
  constraint ubs_needs_pkey primary key (id),
  constraint ubs_needs_ubs_id_key unique (ubs_id),
  constraint ubs_needs_created_by_fkey foreign KEY (created_by) references usuarios (id),
  constraint ubs_needs_ubs_id_fkey foreign KEY (ubs_id) references ubs (id) on delete CASCADE,
  constraint ubs_needs_updated_by_fkey foreign KEY (updated_by) references usuarios (id)
) TABLESPACE pg_default;

create table public.ubs_services (
  id serial not null,
  ubs_id integer not null,
  service_id integer not null,
  created_at timestamp with time zone null default now(),
  constraint ubs_services_pkey primary key (id),
  constraint uq_ubs_service unique (ubs_id, service_id),
  constraint ubs_services_service_id_fkey foreign KEY (service_id) references services (id) on delete CASCADE,
  constraint ubs_services_ubs_id_fkey foreign KEY (ubs_id) references ubs (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.ubs_problems (
  id serial not null,
  ubs_id integer not null,
  titulo character varying(255) not null,
  descricao text null,
  gut_gravidade integer not null default 1,
  gut_urgencia integer not null default 1,
  gut_tendencia integer not null default 1,
  gut_score integer not null default 1,
  is_prioritario boolean not null default false,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null,
  constraint ubs_problems_pkey primary key (id),
  constraint ubs_problems_ubs_id_fkey foreign KEY (ubs_id) references ubs (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.ubs_interventions (
  id serial not null,
  problem_id integer not null,
  objetivo text not null,
  metas text null,
  responsavel character varying(255) null,
  status character varying(30) not null default 'PLANEJADO',
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null,
  constraint ubs_interventions_pkey primary key (id),
  constraint ubs_interventions_problem_id_fkey foreign KEY (problem_id) references ubs_problems (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.ubs_intervention_actions (
  id serial not null,
  intervention_id integer not null,
  acao text not null,
  prazo date null,
  status character varying(30) not null default 'PLANEJADO',
  observacoes text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null,
  constraint ubs_intervention_actions_pkey primary key (id),
  constraint ubs_intervention_actions_intervention_id_fkey foreign KEY (intervention_id) references ubs_interventions (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.professional_requests (
  id serial not null,
  user_id integer not null,
  cargo character varying(100) not null,
  registro_profissional character varying(50) not null,
  status character varying(20) not null default 'PENDING',
  rejection_reason character varying(255) null,
  submitted_at timestamp with time zone not null default now(),
  reviewed_at timestamp with time zone null,
  reviewed_by_user_id integer null,
  constraint professional_requests_pkey primary key (id),
  constraint professional_requests_user_id_key unique (user_id),
  constraint professional_requests_registro_profissional_key unique (registro_profissional),
  constraint professional_requests_user_id_fkey foreign KEY (user_id) references usuarios (id),
  constraint professional_requests_reviewed_by_user_id_fkey foreign KEY (reviewed_by_user_id) references usuarios (id)
) TABLESPACE pg_default;

create table public.agendamentos (
  id serial not null,
  paciente_id integer not null,
  profissional_id integer not null,
  data_hora timestamp with time zone not null,
  status character varying(20) not null default 'AGENDADO',
  observacoes text null,
  confirmacao_enviada timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null,
  constraint agendamentos_pkey primary key (id),
  constraint agendamentos_paciente_id_fkey foreign KEY (paciente_id) references usuarios (id),
  constraint agendamentos_profissional_id_fkey foreign KEY (profissional_id) references profissionais (id)
) TABLESPACE pg_default;

create table public.bloqueios_agenda (
  id serial not null,
  profissional_id integer not null,
  data_inicio timestamp with time zone not null,
  data_fim timestamp with time zone not null,
  motivo character varying(255) null,
  created_at timestamp with time zone null default now(),
  constraint bloqueios_agenda_pkey primary key (id),
  constraint bloqueios_agenda_profissional_id_fkey foreign KEY (profissional_id) references profissionais (id)
) TABLESPACE pg_default;

create table public.educational_materials (
  id serial not null,
  ubs_id integer not null,
  titulo character varying(255) not null,
  descricao text null,
  categoria character varying(80) null,
  publico_alvo character varying(80) null,
  ativo boolean not null default true,
  created_by integer null,
  updated_by integer null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null,
  constraint educational_materials_pkey primary key (id),
  constraint educational_materials_created_by_fkey foreign KEY (created_by) references usuarios (id),
  constraint educational_materials_updated_by_fkey foreign KEY (updated_by) references usuarios (id),
  constraint educational_materials_ubs_id_fkey foreign KEY (ubs_id) references ubs (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.educational_material_files (
  id serial not null,
  material_id integer not null,
  original_filename character varying(255) not null,
  content_type character varying(100) null,
  size_bytes integer not null default 0,
  storage_path text not null,
  created_at timestamp with time zone null default now(),
  constraint educational_material_files_pkey primary key (id),
  constraint educational_material_files_material_id_fkey foreign KEY (material_id) references educational_materials (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.cronograma_events (
  id serial not null,
  ubs_id integer not null,
  titulo character varying(255) not null,
  tipo character varying(30) not null default 'OUTRO',
  local character varying(255) null,
  inicio timestamp with time zone not null,
  fim timestamp with time zone null,
  dia_inteiro boolean not null default false,
  observacoes text null,
  recorrencia character varying(20) not null default 'NONE',
  recorrencia_intervalo integer not null default 1,
  recorrencia_fim date null,
  created_by integer null,
  updated_by integer null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null,
  constraint cronograma_events_pkey primary key (id),
  constraint cronograma_events_created_by_fkey foreign KEY (created_by) references usuarios (id),
  constraint cronograma_events_updated_by_fkey foreign KEY (updated_by) references usuarios (id),
  constraint cronograma_events_ubs_id_fkey foreign KEY (ubs_id) references ubs (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.usuarios (
  id serial not null,
  nome character varying(100) not null,
  email character varying(200) not null,
  senha character varying(255) not null,
  cpf character varying(14) not null,
  role character varying(20) not null default 'USER',
  welcome_email_sent boolean default false,
  ativo boolean not null,
  tentativas_login integer not null,
  bloqueado_ate timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null,
  constraint usuarios_pkey primary key (id),
  constraint usuarios_cpf_key unique (cpf),
  constraint usuarios_email_key unique (email)
) TABLESPACE pg_default;

create table public.suporte_feedback (
  id serial not null,
  usuario_id integer not null,
  assunto character varying(50) not null,
  mensagem text not null,
  status character varying(20) not null default 'PENDENTE',
  created_at timestamp with time zone null default now(),
  constraint suporte_feedback_pkey primary key (id),
  constraint suporte_feedback_usuario_id_fkey foreign KEY (usuario_id) references usuarios (id)
) TABLESPACE pg_default;

create table public.microareas (
  id serial not null,
  ubs_id integer not null,
  nome character varying(100) not null,
  status character varying(20) not null default 'COBERTA',
  populacao integer not null default 0,
  familias integer not null default 0,
  geojson jsonb null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null,
  constraint microareas_pkey primary key (id),
  constraint microareas_ubs_id_fkey foreign KEY (ubs_id) references ubs (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.agentes_saude (
  id serial not null,
  usuario_id integer not null,
  microarea_id integer not null,
  ativo boolean not null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null,
  constraint agentes_saude_pkey primary key (id),
  constraint agentes_saude_usuario_id_fkey foreign KEY (usuario_id) references usuarios (id),
  constraint agentes_saude_microarea_id_fkey foreign KEY (microarea_id) references microareas (id) on delete CASCADE
) TABLESPACE pg_default;
```

---

## 2. Novos Scripts (Para executar no Supabase)

Execute estes scripts na ordem apresentada para atualizar o banco de dados com as novas funcionalidades (Roles, Solicitações Profissionais e Agendamento).

### 2.1. Atualizar Tabela `usuarios`
Adiciona a coluna `role` que está faltando.

```sql
ALTER TABLE public.usuarios 
ADD COLUMN role character varying(20) NOT NULL DEFAULT 'USER';
```

### 2.2. Criar Tabela `professional_requests`
Tabela para gerenciar solicitações de cadastro de profissionais.

```sql
CREATE TABLE public.professional_requests (
    id serial NOT NULL,
    user_id integer NOT NULL,
    cargo character varying(100) NOT NULL,
    registro_profissional character varying(50) NOT NULL,
    status character varying(20) NOT NULL DEFAULT 'PENDING',
    rejection_reason character varying(255) NULL,
    submitted_at timestamp with time zone NOT NULL DEFAULT now(),
    reviewed_at timestamp with time zone NULL,
    reviewed_by_user_id integer NULL,
    
    CONSTRAINT professional_requests_pkey PRIMARY KEY (id),
    CONSTRAINT professional_requests_user_id_key UNIQUE (user_id),
    CONSTRAINT professional_requests_registro_profissional_key UNIQUE (registro_profissional),
    CONSTRAINT professional_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.usuarios (id),
    CONSTRAINT professional_requests_reviewed_by_user_id_fkey FOREIGN KEY (reviewed_by_user_id) REFERENCES public.usuarios (id)
) TABLESPACE pg_default;
```

### 2.3. Criar Tabela `agendamentos`
Tabela para o módulo de agendamento de consultas.

```sql
CREATE TABLE public.agendamentos (
    id serial NOT NULL,
    paciente_id integer NOT NULL,
    profissional_id integer NOT NULL,
    data_hora timestamp with time zone NOT NULL,
    status character varying(20) NOT NULL DEFAULT 'AGENDADO',
    observacoes text NULL,
    confirmacao_enviada timestamp with time zone NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL,
    
    CONSTRAINT agendamentos_pkey PRIMARY KEY (id),
    CONSTRAINT agendamentos_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.usuarios (id),
    CONSTRAINT agendamentos_profissional_id_fkey FOREIGN KEY (profissional_id) REFERENCES public.profissionais (id)
) TABLESPACE pg_default;
```

### 2.4. Criar Tabela `bloqueios_agenda`
Tabela para bloqueios de agenda por profissionais.

```sql
CREATE TABLE public.bloqueios_agenda (
    id serial NOT NULL,
    profissional_id integer NOT NULL,
    data_inicio timestamp with time zone NOT NULL,
    data_fim timestamp with time zone NOT NULL,
    motivo character varying(255) NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    
    CONSTRAINT bloqueios_agenda_pkey PRIMARY KEY (id),
    CONSTRAINT bloqueios_agenda_profissional_id_fkey FOREIGN KEY (profissional_id) REFERENCES public.profissionais (id)
) TABLESPACE pg_default;
```

### 2.5. Inserir Profissionais de Teste
Scripts para inserir dados de profissionais fictícios na base de dados.

```sql
-- 1. Ana Silva
INSERT INTO usuarios (nome, email, senha, cpf, role, ativo, tentativas_login, created_at, updated_at)
VALUES ('Ana Silva', 'ana.silva0@example.com', '$pbkdf2-sha256$29000$7h2j1Lq31hoDAIDQ2htDCA$K5D8j/FzjN8I7ixaYwvDRxABi7RZAZVIpDTTwtydElo', '830.615.374-35', 'PROFISSIONAL', TRUE, 0, NOW(), NOW());

INSERT INTO profissionais (usuario_id, cargo, registro_professional, ativo, created_at, updated_at)
VALUES (currval('usuarios_id_seq'), 'Fisioterapeuta', 'F-27769', TRUE, NOW(), NOW());

-- 2. Bruno Costa
INSERT INTO usuarios (nome, email, senha, cpf, role, ativo, tentativas_login, created_at, updated_at)
VALUES ('Bruno Costa', 'bruno.costa1@example.com', '$pbkdf2-sha256$29000$7h2j1Lq31hoDAIDQ2htDCA$K5D8j/FzjN8I7ixaYwvDRxABi7RZAZVIpDTTwtydElo', '164.753.338-87', 'PROFISSIONAL', TRUE, 0, NOW(), NOW());

INSERT INTO profissionais (usuario_id, cargo, registro_professional, ativo, created_at, updated_at)
VALUES (currval('usuarios_id_seq'), 'Assistente Social', 'AS-50523', TRUE, NOW(), NOW());

-- 3. Carla Dias
INSERT INTO usuarios (nome, email, senha, cpf, role, ativo, tentativas_login, created_at, updated_at)
VALUES ('Carla Dias', 'carla.dias2@example.com', '$pbkdf2-sha256$29000$7h2j1Lq31hoDAIDQ2htDCA$K5D8j/FzjN8I7ixaYwvDRxABi7RZAZVIpDTTwtydElo', '330.407.424-76', 'PROFISSIONAL', TRUE, 0, NOW(), NOW());

INSERT INTO profissionais (usuario_id, cargo, registro_professional, ativo, created_at, updated_at)
VALUES (currval('usuarios_id_seq'), 'Médico', 'M-84542', TRUE, NOW(), NOW());

-- 4. Daniel Souza
INSERT INTO usuarios (nome, email, senha, cpf, role, ativo, tentativas_login, created_at, updated_at)
VALUES ('Daniel Souza', 'daniel.souza3@example.com', '$pbkdf2-sha256$29000$7h2j1Lq31hoDAIDQ2htDCA$K5D8j/FzjN8I7ixaYwvDRxABi7RZAZVIpDTTwtydElo', '511.453.290-30', 'PROFISSIONAL', TRUE, 0, NOW(), NOW());

INSERT INTO profissionais (usuario_id, cargo, registro_professional, ativo, created_at, updated_at)
VALUES (currval('usuarios_id_seq'), 'Técnico de Enfermagem', 'TDE-31228', TRUE, NOW(), NOW());

-- 5. Eduarda Lima
INSERT INTO usuarios (nome, email, senha, cpf, role, ativo, tentativas_login, created_at, updated_at)
VALUES ('Eduarda Lima', 'eduarda.lima4@example.com', '$pbkdf2-sha256$29000$7h2j1Lq31hoDAIDQ2htDCA$K5D8j/FzjN8I7ixaYwvDRxABi7RZAZVIpDTTwtydElo', '503.108.951-23', 'PROFISSIONAL', TRUE, 0, NOW(), NOW());

INSERT INTO profissionais (usuario_id, cargo, registro_professional, ativo, created_at, updated_at)
VALUES (currval('usuarios_id_seq'), 'Assistente Social', 'AS-65525', TRUE, NOW(), NOW());

-- 6. Fernando Rocha
INSERT INTO usuarios (nome, email, senha, cpf, role, ativo, tentativas_login, created_at, updated_at)
VALUES ('Fernando Rocha', 'fernando.rocha5@example.com', '$pbkdf2-sha256$29000$7h2j1Lq31hoDAIDQ2htDCA$K5D8j/FzjN8I7ixaYwvDRxABi7RZAZVIpDTTwtydElo', '916.566.191-12', 'PROFISSIONAL', TRUE, 0, NOW(), NOW());

INSERT INTO profissionais (usuario_id, cargo, registro_professional, ativo, created_at, updated_at)
VALUES (currval('usuarios_id_seq'), 'Fisioterapeuta', 'F-45987', TRUE, NOW(), NOW());

-- 7. Giovana Alves
INSERT INTO usuarios (nome, email, senha, cpf, role, ativo, tentativas_login, created_at, updated_at)
VALUES ('Giovana Alves', 'giovana.alves6@example.com', '$pbkdf2-sha256$29000$7h2j1Lq31hoDAIDQ2htDCA$K5D8j/FzjN8I7ixaYwvDRxABi7RZAZVIpDTTwtydElo', '806.127.276-99', 'PROFISSIONAL', TRUE, 0, NOW(), NOW());

INSERT INTO profissionais (usuario_id, cargo, registro_professional, ativo, created_at, updated_at)
VALUES (currval('usuarios_id_seq'), 'Enfermeiro', 'E-24611', TRUE, NOW(), NOW());

-- 8. Hugo Pereira
INSERT INTO usuarios (nome, email, senha, cpf, role, ativo, tentativas_login, created_at, updated_at)
VALUES ('Hugo Pereira', 'hugo.pereira7@example.com', '$pbkdf2-sha256$29000$7h2j1Lq31hoDAIDQ2htDCA$K5D8j/FzjN8I7ixaYwvDRxABi7RZAZVIpDTTwtydElo', '146.185.626-25', 'PROFISSIONAL', TRUE, 0, NOW(), NOW());

INSERT INTO profissionais (usuario_id, cargo, registro_professional, ativo, created_at, updated_at)
VALUES (currval('usuarios_id_seq'), 'Assistente Social', 'AS-69993', TRUE, NOW(), NOW());

-- 9. Isabela Gomes
INSERT INTO usuarios (nome, email, senha, cpf, role, ativo, tentativas_login, created_at, updated_at)
VALUES ('Isabela Gomes', 'isabela.gomes8@example.com', '$pbkdf2-sha256$29000$7h2j1Lq31hoDAIDQ2htDCA$K5D8j/FzjN8I7ixaYwvDRxABi7RZAZVIpDTTwtydElo', '256.162.233-49', 'PROFISSIONAL', TRUE, 0, NOW(), NOW());

INSERT INTO profissionais (usuario_id, cargo, registro_professional, ativo, created_at, updated_at)
VALUES (currval('usuarios_id_seq'), 'Assistente Social', 'AS-77843', TRUE, NOW(), NOW());

-- 10. Joao Martins
INSERT INTO usuarios (nome, email, senha, cpf, role, ativo, tentativas_login, created_at, updated_at)
VALUES ('Joao Martins', 'joao.martins9@example.com', '$pbkdf2-sha256$29000$7h2j1Lq31hoDAIDQ2htDCA$K5D8j/FzjN8I7ixaYwvDRxABi7RZAZVIpDTTwtydElo', '719.133.233-80', 'PROFISSIONAL', TRUE, 0, NOW(), NOW());

INSERT INTO profissionais (usuario_id, cargo, registro_professional, ativo, created_at, updated_at)
VALUES (currval('usuarios_id_seq'), 'Dentista', 'D-55622', TRUE, NOW(), NOW());

-- 11. Larissa Fernandes
INSERT INTO usuarios (nome, email, senha, cpf, role, ativo, tentativas_login, created_at, updated_at)
VALUES ('Larissa Fernandes', 'larissa.fernandes10@example.com', '$pbkdf2-sha256$29000$7h2j1Lq31hoDAIDQ2htDCA$K5D8j/FzjN8I7ixaYwvDRxABi7RZAZVIpDTTwtydElo', '623.309.488-88', 'PROFISSIONAL', TRUE, 0, NOW(), NOW());

INSERT INTO profissionais (usuario_id, cargo, registro_professional, ativo, created_at, updated_at)
VALUES (currval('usuarios_id_seq'), 'Psicólogo', 'P-25890', TRUE, NOW(), NOW());

-- 12. Marcelo Ribeiro
INSERT INTO usuarios (nome, email, senha, cpf, role, ativo, tentativas_login, created_at, updated_at)
VALUES ('Marcelo Ribeiro', 'marcelo.ribeiro11@example.com', '$pbkdf2-sha256$29000$7h2j1Lq31hoDAIDQ2htDCA$K5D8j/FzjN8I7ixaYwvDRxABi7RZAZVIpDTTwtydElo', '191.270.403-70', 'PROFISSIONAL', TRUE, 0, NOW(), NOW());

INSERT INTO profissionais (usuario_id, cargo, registro_professional, ativo, created_at, updated_at)
VALUES (currval('usuarios_id_seq'), 'Técnico de Enfermagem', 'TDE-13235', TRUE, NOW(), NOW());

-- 13. Natalia Santos
INSERT INTO usuarios (nome, email, senha, cpf, role, ativo, tentativas_login, created_at, updated_at)
VALUES ('Natalia Santos', 'natalia.santos12@example.com', '$pbkdf2-sha256$29000$7h2j1Lq31hoDAIDQ2htDCA$K5D8j/FzjN8I7ixaYwvDRxABi7RZAZVIpDTTwtydElo', '346.445.237-83', 'PROFISSIONAL', TRUE, 0, NOW(), NOW());

INSERT INTO profissionais (usuario_id, cargo, registro_professional, ativo, created_at, updated_at)
VALUES (currval('usuarios_id_seq'), 'Psicólogo', 'P-64542', TRUE, NOW(), NOW());

-- 14. Otavio Carvalho
INSERT INTO usuarios (nome, email, senha, cpf, role, ativo, tentativas_login, created_at, updated_at)
VALUES ('Otavio Carvalho', 'otavio.carvalho13@example.com', '$pbkdf2-sha256$29000$7h2j1Lq31hoDAIDQ2htDCA$K5D8j/FzjN8I7ixaYwvDRxABi7RZAZVIpDTTwtydElo', '396.521.375-49', 'PROFISSIONAL', TRUE, 0, NOW(), NOW());

INSERT INTO profissionais (usuario_id, cargo, registro_professional, ativo, created_at, updated_at)
VALUES (currval('usuarios_id_seq'), 'Nutricionista', 'N-90495', TRUE, NOW(), NOW());

-- 15. Patricia Mendes
INSERT INTO usuarios (nome, email, senha, cpf, role, ativo, tentativas_login, created_at, updated_at)
VALUES ('Patricia Mendes', 'patricia.mendes14@example.com', '$pbkdf2-sha256$29000$7h2j1Lq31hoDAIDQ2htDCA$K5D8j/FzjN8I7ixaYwvDRxABi7RZAZVIpDTTwtydElo', '290.277.688-32', 'PROFISSIONAL', TRUE, 0, NOW(), NOW());

INSERT INTO profissionais (usuario_id, cargo, registro_professional, ativo, created_at, updated_at)
VALUES (currval('usuarios_id_seq'), 'Fisioterapeuta', 'F-41356', TRUE, NOW(), NOW());

-- 16. Ricardo Barros
INSERT INTO usuarios (nome, email, senha, cpf, role, ativo, tentativas_login, created_at, updated_at)
VALUES ('Ricardo Barros', 'ricardo.barros15@example.com', '$pbkdf2-sha256$29000$7h2j1Lq31hoDAIDQ2htDCA$K5D8j/FzjN8I7ixaYwvDRxABi7RZAZVIpDTTwtydElo', '360.267.666-66', 'PROFISSIONAL', TRUE, 0, NOW(), NOW());

INSERT INTO profissionais (usuario_id, cargo, registro_professional, ativo, created_at, updated_at)
VALUES (currval('usuarios_id_seq'), 'Nutricionista', 'N-32386', TRUE, NOW(), NOW());

-- 17. Sofia Correia
INSERT INTO usuarios (nome, email, senha, cpf, role, ativo, tentativas_login, created_at, updated_at)
VALUES ('Sofia Correia', 'sofia.correia16@example.com', '$pbkdf2-sha256$29000$7h2j1Lq31hoDAIDQ2htDCA$K5D8j/FzjN8I7ixaYwvDRxABi7RZAZVIpDTTwtydElo', '417.974.186-13', 'PROFISSIONAL', TRUE, 0, NOW(), NOW());

INSERT INTO profissionais (usuario_id, cargo, registro_professional, ativo, created_at, updated_at)
VALUES (currval('usuarios_id_seq'), 'Farmacêutico', 'F-60480', TRUE, NOW(), NOW());

-- 18. Thiago Nogueira
INSERT INTO usuarios (nome, email, senha, cpf, role, ativo, tentativas_login, created_at, updated_at)
VALUES ('Thiago Nogueira', 'thiago.nogueira17@example.com', '$pbkdf2-sha256$29000$7h2j1Lq31hoDAIDQ2htDCA$K5D8j/FzjN8I7ixaYwvDRxABi7RZAZVIpDTTwtydElo', '901.686.925-95', 'PROFISSIONAL', TRUE, 0, NOW(), NOW());

INSERT INTO profissionais (usuario_id, cargo, registro_professional, ativo, created_at, updated_at)
VALUES (currval('usuarios_id_seq'), 'Farmacêutico', 'F-13510', TRUE, NOW(), NOW());

-- 19. Veronica Almeida
INSERT INTO usuarios (nome, email, senha, cpf, role, ativo, tentativas_login, created_at, updated_at)
VALUES ('Veronica Almeida', 'veronica.almeida18@example.com', '$pbkdf2-sha256$29000$7h2j1Lq31hoDAIDQ2htDCA$K5D8j/FzjN8I7ixaYwvDRxABi7RZAZVIpDTTwtydElo', '445.829.512-38', 'PROFISSIONAL', TRUE, 0, NOW(), NOW());

INSERT INTO profissionais (usuario_id, cargo, registro_professional, ativo, created_at, updated_at)
VALUES (currval('usuarios_id_seq'), 'Recepcionista', 'R-34449', TRUE, NOW(), NOW());

-- 20. Wilson Castro
INSERT INTO usuarios (nome, email, senha, cpf, role, ativo, tentativas_login, created_at, updated_at)
VALUES ('Wilson Castro', 'wilson.castro19@example.com', '$pbkdf2-sha256$29000$7h2j1Lq31hoDAIDQ2htDCA$K5D8j/FzjN8I7ixaYwvDRxABi7RZAZVIpDTTwtydElo', '423.220.223-41', 'PROFISSIONAL', TRUE, 0, NOW(), NOW());

INSERT INTO profissionais (usuario_id, cargo, registro_professional, ativo, created_at, updated_at)
VALUES (currval('usuarios_id_seq'), 'Técnico de Enfermagem', 'TDE-48687', TRUE, NOW(), NOW());
```

### 2.6. Usuários de Teste (Seed Data)
Usuários padrão para validação de perfis e permissões. Senha padrão: `Plataforma123`

```sql
-- Paciente (USER)
INSERT INTO public.usuarios (nome, email, senha, cpf, role, ativo, tentativas_login, welcome_email_sent, created_at, updated_at)
VALUES ('Paciente de Teste', 'teste.paciente@plataforma.com', '$pbkdf2-sha256$29000$3VvL.X/PuVeqFYJQ6v3fmw$DeWP4kJ4JIgk3lpxXsRXEagRvrprhj82aahb1egA1Es', '111.444.777-35', 'USER', TRUE, 0, TRUE, NOW(), NOW()) ON CONFLICT (email) DO NOTHING;

-- Gestor (GESTOR)
INSERT INTO public.usuarios (nome, email, senha, cpf, role, ativo, tentativas_login, welcome_email_sent, created_at, updated_at)
VALUES ('Gestor de Teste', 'teste.gestor@plataforma.com', '$pbkdf2-sha256$29000$3VvL.X/PuVeqFYJQ6v3fmw$DeWP4kJ4JIgk3lpxXsRXEagRvrprhj82aahb1egA1Es', '222.555.888-41', 'GESTOR', TRUE, 0, TRUE, NOW(), NOW()) ON CONFLICT (email) DO NOTHING;

-- Recepcionista (RECEPCAO)
INSERT INTO public.usuarios (nome, email, senha, cpf, role, ativo, tentativas_login, welcome_email_sent, created_at, updated_at)
VALUES ('Recepção de Teste', 'recepcao@plataforma.com', '$pbkdf2-sha256$29000$3VvL.X/PuVeqFYJQ6v3fmw$DeWP4kJ4JIgk3lpxXsRXEagRvrprhj82aahb1egA1Es', '468.102.350-01', 'RECEPCAO', TRUE, 0, TRUE, NOW(), NOW()) ON CONFLICT (email) DO NOTHING;
```

### 2.7. Atualizar Tabela `usuarios` (Controle de Boas-vindas) - **NOVO**
Adiciona a coluna para controlar se o e-mail de boas-vindas manual já foi enviado.

```sql
ALTER TABLE public.usuarios
ADD COLUMN welcome_email_sent boolean DEFAULT false;
```

### 2.8. Atualizar Tabela `indicators` (Simplificação de Indicadores Epidemiológicos) - **NOVO**
Remove as colunas `tipo_dado` e `grau_precisao_valor` (que já não são utilizadas) e adiciona as novas colunas `meta` e `tipo_valor`.

```sql
-- Passo 1: Remover colunas obsoletas
ALTER TABLE public.indicators
DROP COLUMN IF EXISTS tipo_dado,
DROP COLUMN IF EXISTS grau_precisao_valor;

-- Passo 2: Adicionar novas colunas
ALTER TABLE public.indicators
ADD COLUMN meta numeric(18, 4) NULL,
ADD COLUMN tipo_valor character varying(40) NULL DEFAULT 'PERCENTUAL';
```

### 2.9. Criar Tabela `suporte_feedback` (Módulo Suporte e Feedback) - **NOVO**
Tabela para armazenar mensagens de suporte e feedback enviadas pelos usuários.

```sql
CREATE TABLE public.suporte_feedback (
    id serial NOT NULL,
    usuario_id integer NOT NULL,
    assunto character varying(50) NOT NULL,
    mensagem text NOT NULL,
    status character varying(20) NOT NULL DEFAULT 'PENDENTE',
    created_at timestamp with time zone NULL DEFAULT now(),

    CONSTRAINT suporte_feedback_pkey PRIMARY KEY (id),
    CONSTRAINT suporte_feedback_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios (id)
) TABLESPACE pg_default;
```

### 2.10. Criar Tabelas `microareas` e `agentes_saude` (Módulo Gestão de Equipes e Microáreas) - **NOVO**
Tabelas para o módulo de gestão de equipes, microáreas e agentes comunitários de saúde.

```sql
-- Tabela de microáreas do território
CREATE TABLE public.microareas (
    id serial NOT NULL,
    ubs_id integer NOT NULL,
    nome character varying(100) NOT NULL,
    status character varying(20) NOT NULL DEFAULT 'COBERTA',
    populacao integer NOT NULL DEFAULT 0,
    familias integer NOT NULL DEFAULT 0,
    geojson jsonb NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL,

    CONSTRAINT microareas_pkey PRIMARY KEY (id),
    CONSTRAINT microareas_ubs_id_fkey FOREIGN KEY (ubs_id) REFERENCES public.ubs (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Tabela de agentes comunitários de saúde
CREATE TABLE public.agentes_saude (
    id serial NOT NULL,
    usuario_id integer NOT NULL,
    microarea_id integer NOT NULL,
    ativo boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL,

    CONSTRAINT agentes_saude_pkey PRIMARY KEY (id),
    CONSTRAINT agentes_saude_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios (id),
    CONSTRAINT agentes_saude_microarea_id_fkey FOREIGN KEY (microarea_id) REFERENCES public.microareas (id) ON DELETE CASCADE
) TABLESPACE pg_default;
```

### 2.11. Seed Data - Microáreas e Agentes de Saúde (Parnaíba - PI) - **NOVO**
Popula as tabelas com dados fictícios de 7 microáreas (5 cobertas + 2 descobertas) e 5 agentes de saúde para a UBS Adalto Parentes Sampaio. **Pré-requisito:** a UBS com id=3 deve existir na tabela `ubs`.

```sql
-- =============================================
-- MICROÁREAS (7 total: 5 cobertas, 2 descobertas)
-- =============================================
INSERT INTO public.microareas (ubs_id, nome, status, populacao, familias) VALUES
(3, 'Microárea 01 - Baixa do Aragão', 'COBERTA', 2100, 210),
(3, 'Microárea 02 - Centro', 'COBERTA', 1850, 185),
(3, 'Microárea 03 - Piauí', 'COBERTA', 2300, 230),
(3, 'Microárea 04 - Frei Higino', 'COBERTA', 1950, 195),
(3, 'Microárea 05 - Pindorama', 'COBERTA', 2200, 220),
(3, 'Microárea 06 - São José', 'DESCOBERTA', 1100, 110),
(3, 'Microárea 07 - Rodoviária', 'DESCOBERTA', 950, 95);

-- =============================================
-- USUÁRIOS ACS (Agentes Comunitários de Saúde)
-- Senha padrão: Plataforma123
-- =============================================
INSERT INTO public.usuarios (nome, email, senha, cpf, role, ativo, tentativas_login, welcome_email_sent, created_at, updated_at) VALUES
('Maria José da Silva', 'maria.silva.acs@plataforma.com', '$pbkdf2-sha256$29000$3VvL.X/PuVeqFYJQ6v3fmw$DeWP4kJ4JIgk3lpxXsRXEagRvrprhj82aahb1egA1Es', '712.345.678-01', 'ACS', TRUE, 0, TRUE, NOW(), NOW()),
('Francisco Alves de Sousa', 'francisco.sousa.acs@plataforma.com', '$pbkdf2-sha256$29000$3VvL.X/PuVeqFYJQ6v3fmw$DeWP4kJ4JIgk3lpxXsRXEagRvrprhj82aahb1egA1Es', '823.456.789-02', 'ACS', TRUE, 0, TRUE, NOW(), NOW()),
('Ana Cláudia Ferreira', 'ana.ferreira.acs@plataforma.com', '$pbkdf2-sha256$29000$3VvL.X/PuVeqFYJQ6v3fmw$DeWP4kJ4JIgk3lpxXsRXEagRvrprhj82aahb1egA1Es', '934.567.890-03', 'ACS', TRUE, 0, TRUE, NOW(), NOW()),
('José Ribamar Costa', 'jose.costa.acs@plataforma.com', '$pbkdf2-sha256$29000$3VvL.X/PuVeqFYJQ6v3fmw$DeWP4kJ4JIgk3lpxXsRXEagRvrprhj82aahb1egA1Es', '145.678.901-04', 'ACS', TRUE, 0, TRUE, NOW(), NOW()),
('Francisca das Chagas Lima', 'francisca.lima.acs@plataforma.com', '$pbkdf2-sha256$29000$3VvL.X/PuVeqFYJQ6v3fmw$DeWP4kJ4JIgk3lpxXsRXEagRvrprhj82aahb1egA1Es', '256.789.012-05', 'ACS', TRUE, 0, TRUE, NOW(), NOW());

-- =============================================
-- AGENTES DE SAÚDE (vinculando usuários às microáreas)
-- NOTA: Os IDs dos usuários e microáreas dependem da ordem de inserção.
-- Ajuste os IDs conforme necessário após executar os INSERTs acima.
-- Use as queries abaixo para vincular corretamente:
-- =============================================
INSERT INTO public.agentes_saude (usuario_id, microarea_id, ativo)
SELECT u.id, m.id, TRUE
FROM public.usuarios u, public.microareas m
WHERE u.email = 'maria.silva.acs@plataforma.com' AND m.nome = 'Microárea 01 - Baixa do Aragão';

INSERT INTO public.agentes_saude (usuario_id, microarea_id, ativo)
SELECT u.id, m.id, TRUE
FROM public.usuarios u, public.microareas m
WHERE u.email = 'francisco.sousa.acs@plataforma.com' AND m.nome = 'Microárea 02 - Centro';

INSERT INTO public.agentes_saude (usuario_id, microarea_id, ativo)
SELECT u.id, m.id, TRUE
FROM public.usuarios u, public.microareas m
WHERE u.email = 'ana.ferreira.acs@plataforma.com' AND m.nome = 'Microárea 03 - Piauí';

INSERT INTO public.agentes_saude (usuario_id, microarea_id, ativo)
SELECT u.id, m.id, TRUE
FROM public.usuarios u, public.microareas m
WHERE u.email = 'jose.costa.acs@plataforma.com' AND m.nome = 'Microárea 04 - Frei Higino';

INSERT INTO public.agentes_saude (usuario_id, microarea_id, ativo)
SELECT u.id, m.id, TRUE
FROM public.usuarios u, public.microareas m
WHERE u.email = 'francisca.lima.acs@plataforma.com' AND m.nome = 'Microárea 05 - Pindorama';
```