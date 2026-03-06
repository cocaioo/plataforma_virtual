-- Incremental SQL (sessao atual)

-- 1) Tabelas para Mapa de problemas e Intervencoes (GUT + plano)
CREATE TABLE IF NOT EXISTS ubs_problems (
	id SERIAL PRIMARY KEY,
	ubs_id INTEGER NOT NULL REFERENCES ubs(id) ON DELETE CASCADE,
	titulo VARCHAR(255) NOT NULL,
	descricao TEXT NULL,
	gut_gravidade INTEGER NOT NULL DEFAULT 1,
	gut_urgencia INTEGER NOT NULL DEFAULT 1,
	gut_tendencia INTEGER NOT NULL DEFAULT 1,
	gut_score INTEGER NOT NULL DEFAULT 1,
	is_prioritario BOOLEAN NOT NULL DEFAULT FALSE,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS ubs_interventions (
	id SERIAL PRIMARY KEY,
	problem_id INTEGER NOT NULL REFERENCES ubs_problems(id) ON DELETE CASCADE,
	objetivo TEXT NOT NULL,
	metas TEXT NULL,
	responsavel VARCHAR(255) NULL,
	status VARCHAR(30) NOT NULL DEFAULT 'PLANEJADO',
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS ubs_intervention_actions (
	id SERIAL PRIMARY KEY,
	intervention_id INTEGER NOT NULL REFERENCES ubs_interventions(id) ON DELETE CASCADE,
	acao TEXT NOT NULL,
	prazo DATE NULL,
	status VARCHAR(30) NOT NULL DEFAULT 'PLANEJADO',
	observacoes TEXT NULL,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ NULL
);

-- 2) Tabelas para Materiais Educativos
CREATE TABLE IF NOT EXISTS educational_materials (
	id SERIAL PRIMARY KEY,
	ubs_id INTEGER NOT NULL REFERENCES ubs(id) ON DELETE CASCADE,
	titulo VARCHAR(255) NOT NULL,
	descricao TEXT NULL,
	categoria VARCHAR(80) NULL,
	publico_alvo VARCHAR(80) NULL,
	ativo BOOLEAN NOT NULL DEFAULT TRUE,
	created_by INTEGER NULL REFERENCES usuarios(id),
	updated_by INTEGER NULL REFERENCES usuarios(id),
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS educational_material_files (
	id SERIAL PRIMARY KEY,
	material_id INTEGER NOT NULL REFERENCES educational_materials(id) ON DELETE CASCADE,
	original_filename VARCHAR(255) NOT NULL,
	content_type VARCHAR(100) NULL,
	size_bytes INTEGER NOT NULL DEFAULT 0,
	storage_path TEXT NOT NULL,
	created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3) Tabela para Cronograma e Calendario
CREATE TABLE IF NOT EXISTS cronograma_events (
	id SERIAL PRIMARY KEY,
	ubs_id INTEGER NOT NULL REFERENCES ubs(id) ON DELETE CASCADE,
	titulo VARCHAR(255) NOT NULL,
	tipo VARCHAR(30) NOT NULL DEFAULT 'OUTRO',
	local VARCHAR(255) NULL,
	inicio TIMESTAMPTZ NOT NULL,
	fim TIMESTAMPTZ NULL,
	dia_inteiro BOOLEAN NOT NULL DEFAULT FALSE,
	observacoes TEXT NULL,
	recorrencia VARCHAR(20) NOT NULL DEFAULT 'NONE',
	recorrencia_intervalo INTEGER NOT NULL DEFAULT 1,
	recorrencia_fim DATE NULL,
	created_by INTEGER NULL REFERENCES usuarios(id),
	updated_by INTEGER NULL REFERENCES usuarios(id),
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ NULL
);

-- 4) Tabela para Suporte e Feedback
CREATE TABLE IF NOT EXISTS suporte_feedback (
	id SERIAL PRIMARY KEY,
	usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
	assunto VARCHAR(50) NOT NULL,
	mensagem TEXT NOT NULL,
	status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
	created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5) Migração de roles: 5 roles → 3 roles + cargo
-- Adiciona coluna cargo na tabela usuarios
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS cargo VARCHAR(100) NULL;

-- Migra RECEPCAO → PROFISSIONAL + cargo=Recepcionista
UPDATE public.usuarios
SET role = 'PROFISSIONAL', cargo = 'Recepcionista'
WHERE UPPER(role) = 'RECEPCAO';

-- Migra ACS → PROFISSIONAL + cargo=Agente Comunitário de Saúde
UPDATE public.usuarios
SET role = 'PROFISSIONAL', cargo = 'Agente Comunitário de Saúde'
WHERE UPPER(role) = 'ACS';

-- Preenche cargo de profissionais existentes a partir da tabela profissionais
UPDATE public.usuarios u
SET cargo = p.cargo
FROM public.profissionais p
WHERE u.id = p.usuario_id
  AND UPPER(u.role) = 'PROFISSIONAL'
  AND u.cargo IS NULL
  AND p.ativo = TRUE;

-- 6) Tabela de cargos dinâmicos
CREATE TABLE IF NOT EXISTS cargos (
	id SERIAL PRIMARY KEY,
	nome VARCHAR(255) NOT NULL UNIQUE,
	created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO cargos (nome) VALUES
	('Médico'),('Enfermeiro'),('Dentista'),('Recepcionista'),
	('Agente Comunitário de Saúde'),('Técnico de Enfermagem')
ON CONFLICT DO NOTHING;

-- 7) Adicionar coluna bairro na tabela microareas (Mapa de bairros/microáreas)
-- Permite associar uma microárea a um bairro específico de Parnaíba,
-- refletindo no mapa interativo da seção de gestão de equipes.
ALTER TABLE public.microareas
ADD COLUMN IF NOT EXISTS bairro character varying(150) NULL;

