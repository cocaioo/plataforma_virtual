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
