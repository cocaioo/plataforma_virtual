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
  tipo_dado character varying(40) not null,
  grau_precisao_valor character varying(40) not null,
  valor numeric(18, 4) not null,
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

create table public.usuarios (
  id serial not null,
  nome character varying(100) not null,
  email character varying(200) not null,
  senha character varying(255) not null,
  cpf character varying(14) not null,
  ativo boolean not null,
  tentativas_login integer not null,
  bloqueado_ate timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null,
  constraint usuarios_pkey primary key (id),
  constraint usuarios_cpf_key unique (cpf),
  constraint usuarios_email_key unique (email)
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
VALUES ('Paciente de Teste', 'teste.paciente@plataforma.com', '$pbkdf2-sha256$29000$7h2j1Lq31hoDAIDQ2htDCA$K5D8j/FzjN8I7ixaYwvDRxABi7RZAZVIpDTTwtydElo', '111.444.777-35', 'USER', TRUE, 0, TRUE, NOW(), NOW()) ON CONFLICT (email) DO NOTHING;

-- Gestor (GESTOR)
INSERT INTO public.usuarios (nome, email, senha, cpf, role, ativo, tentativas_login, welcome_email_sent, created_at, updated_at)
VALUES ('Gestor de Teste', 'teste.gestor@plataforma.com', '$pbkdf2-sha256$29000$7h2j1Lq31hoDAIDQ2htDCA$K5D8j/FzjN8I7ixaYwvDRxABi7RZAZVIpDTTwtydElo', '222.555.888-41', 'GESTOR', TRUE, 0, TRUE, NOW(), NOW()) ON CONFLICT (email) DO NOTHING;

-- Recepcionista (RECEPCAO)
INSERT INTO public.usuarios (nome, email, senha, cpf, role, ativo, tentativas_login, welcome_email_sent, created_at, updated_at)
VALUES ('Recepção de Teste', 'teste.recepcao@plataforma.com', '$pbkdf2-sha256$29000$7h2j1Lq31hoDAIDQ2htDCA$K5D8j/FzjN8I7ixaYwvDRxABi7RZAZVIpDTTwtydElo', '333.666.999-91', 'RECEPCAO', TRUE, 0, TRUE, NOW(), NOW()) ON CONFLICT (email) DO NOTHING;
```

### 2.7. Atualizar Tabela `usuarios` (Controle de Boas-vindas) - **NOVO**
Adiciona a coluna para controlar se o e-mail de boas-vindas manual já foi enviado.

```sql
ALTER TABLE public.usuarios 
ADD COLUMN welcome_email_sent boolean DEFAULT false;
```