-- ============================================================
-- SQL para popular os modulos da UBS Adalto Parentes Sampaio
-- UBS ID = 3 | Owner User ID = 2
-- Executar no Supabase SQL Editor
-- ============================================================

BEGIN;

-- ============================================================
-- 1. MAPA DE PROBLEMAS E INTERVENCOES
-- ============================================================

-- Problema 1: Falta de insumos (prioridade ALTA - GUT = 100)
INSERT INTO ubs_problems (ubs_id, titulo, descricao, gut_gravidade, gut_urgencia, gut_tendencia, gut_score, is_prioritario, created_at)
VALUES (3,
    'Falta de insumos na farmacia basica',
    'Medicamentos essenciais como anti-hipertensivos e antidiabeticos em falta ha mais de 2 meses, comprometendo o acompanhamento de pacientes cronicos.',
    5, 5, 4, 100, true, NOW()
);

-- Problema 2: Alta rotatividade de profissionais (prioridade MEDIA - GUT = 48)
INSERT INTO ubs_problems (ubs_id, titulo, descricao, gut_gravidade, gut_urgencia, gut_tendencia, gut_score, is_prioritario, created_at)
VALUES (3,
    'Alta rotatividade de profissionais',
    'Troca frequente de medicos contratados prejudica o vinculo com a comunidade e a continuidade do cuidado.',
    4, 4, 3, 48, false, NOW()
);

-- Problema 3: Baixa cobertura vacinal (prioridade ALTA - GUT = 75)
INSERT INTO ubs_problems (ubs_id, titulo, descricao, gut_gravidade, gut_urgencia, gut_tendencia, gut_score, is_prioritario, created_at)
VALUES (3,
    'Baixa cobertura vacinal em menores de 1 ano',
    'Cobertura vacinal de Polio em 19%, muito abaixo da meta de 95%. Area rural com dificuldade de acesso.',
    5, 5, 3, 75, true, NOW()
);

-- Intervencoes para Problema 1 (Falta de insumos)
INSERT INTO ubs_interventions (problem_id, objetivo, metas, responsavel, status, created_at)
VALUES (
    (SELECT id FROM ubs_problems WHERE ubs_id = 3 AND titulo = 'Falta de insumos na farmacia basica' LIMIT 1),
    'Restabelecer estoque de medicamentos essenciais',
    'Garantir 100% dos medicamentos basicos em estoque ate marco/2025',
    'Coordenadora da Farmacia',
    'EM_ANDAMENTO',
    NOW()
);

-- Acoes para Intervencao do Problema 1
INSERT INTO ubs_intervention_actions (intervention_id, acao, prazo, status, observacoes, created_at)
VALUES (
    (SELECT i.id FROM ubs_interventions i
     JOIN ubs_problems p ON p.id = i.problem_id
     WHERE p.ubs_id = 3 AND p.titulo = 'Falta de insumos na farmacia basica' LIMIT 1),
    'Enviar solicitacao formal de reposicao a Secretaria de Saude',
    '2025-03-01',
    'CONCLUIDO',
    'Oficio enviado em 15/02/2025.',
    NOW()
);

INSERT INTO ubs_intervention_actions (intervention_id, acao, prazo, status, observacoes, created_at)
VALUES (
    (SELECT i.id FROM ubs_interventions i
     JOIN ubs_problems p ON p.id = i.problem_id
     WHERE p.ubs_id = 3 AND p.titulo = 'Falta de insumos na farmacia basica' LIMIT 1),
    'Acompanhar entrega e conferir lote de medicamentos',
    '2025-03-15',
    'PLANEJADO',
    NULL,
    NOW()
);

INSERT INTO ubs_intervention_actions (intervention_id, acao, prazo, status, observacoes, created_at)
VALUES (
    (SELECT i.id FROM ubs_interventions i
     JOIN ubs_problems p ON p.id = i.problem_id
     WHERE p.ubs_id = 3 AND p.titulo = 'Falta de insumos na farmacia basica' LIMIT 1),
    'Implantar controle de estoque mensal com planilha padronizada',
    '2025-04-01',
    'PLANEJADO',
    NULL,
    NOW()
);

-- Intervencoes para Problema 2 (Rotatividade)
INSERT INTO ubs_interventions (problem_id, objetivo, metas, responsavel, status, created_at)
VALUES (
    (SELECT id FROM ubs_problems WHERE ubs_id = 3 AND titulo = 'Alta rotatividade de profissionais' LIMIT 1),
    'Reduzir rotatividade e fortalecer vinculo dos profissionais',
    'Manter o mesmo medico por pelo menos 12 meses consecutivos',
    'Gestor da UBS',
    'PLANEJADO',
    NOW()
);

-- Acoes para Intervencao do Problema 2
INSERT INTO ubs_intervention_actions (intervention_id, acao, prazo, status, observacoes, created_at)
VALUES (
    (SELECT i.id FROM ubs_interventions i
     JOIN ubs_problems p ON p.id = i.problem_id
     WHERE p.ubs_id = 3 AND p.titulo = 'Alta rotatividade de profissionais' LIMIT 1),
    'Solicitar abertura de concurso publico para medico da familia',
    '2025-04-01',
    'PLANEJADO',
    NULL,
    NOW()
);

INSERT INTO ubs_intervention_actions (intervention_id, acao, prazo, status, observacoes, created_at)
VALUES (
    (SELECT i.id FROM ubs_interventions i
     JOIN ubs_problems p ON p.id = i.problem_id
     WHERE p.ubs_id = 3 AND p.titulo = 'Alta rotatividade de profissionais' LIMIT 1),
    'Implementar programa de acolhimento para novos profissionais',
    '2025-03-15',
    'PLANEJADO',
    NULL,
    NOW()
);

-- Intervencoes para Problema 3 (Baixa cobertura vacinal)
INSERT INTO ubs_interventions (problem_id, objetivo, metas, responsavel, status, created_at)
VALUES (
    (SELECT id FROM ubs_problems WHERE ubs_id = 3 AND titulo = 'Baixa cobertura vacinal em menores de 1 ano' LIMIT 1),
    'Aumentar cobertura vacinal para 95% em menores de 1 ano',
    'Atingir meta de 95% ate junho/2025',
    'Enfermeira responsavel pela sala de vacina',
    'EM_ANDAMENTO',
    NOW()
);

-- Acoes para Intervencao do Problema 3
INSERT INTO ubs_intervention_actions (intervention_id, acao, prazo, status, observacoes, created_at)
VALUES (
    (SELECT i.id FROM ubs_interventions i
     JOIN ubs_problems p ON p.id = i.problem_id
     WHERE p.ubs_id = 3 AND p.titulo = 'Baixa cobertura vacinal em menores de 1 ano' LIMIT 1),
    'Realizar busca ativa de criancas com vacinas atrasadas via ACS',
    '2025-03-01',
    'EM_ANDAMENTO',
    'ACS ja iniciaram levantamento nas microareas.',
    NOW()
);

INSERT INTO ubs_intervention_actions (intervention_id, acao, prazo, status, observacoes, created_at)
VALUES (
    (SELECT i.id FROM ubs_interventions i
     JOIN ubs_problems p ON p.id = i.problem_id
     WHERE p.ubs_id = 3 AND p.titulo = 'Baixa cobertura vacinal em menores de 1 ano' LIMIT 1),
    'Organizar mutirao de vacinacao na area rural',
    '2025-03-20',
    'PLANEJADO',
    NULL,
    NOW()
);

INSERT INTO ubs_intervention_actions (intervention_id, acao, prazo, status, observacoes, created_at)
VALUES (
    (SELECT i.id FROM ubs_interventions i
     JOIN ubs_problems p ON p.id = i.problem_id
     WHERE p.ubs_id = 3 AND p.titulo = 'Baixa cobertura vacinal em menores de 1 ano' LIMIT 1),
    'Campanha educativa sobre vacinacao nas escolas do territorio',
    '2025-04-10',
    'PLANEJADO',
    NULL,
    NOW()
);


-- ============================================================
-- 2. CRONOGRAMA E CALENDARIO
-- ============================================================

-- Evento 1: Reuniao de equipe mensal (recorrente)
INSERT INTO cronograma_events (ubs_id, titulo, tipo, local, inicio, fim, dia_inteiro, observacoes, recorrencia, recorrencia_intervalo, recorrencia_fim, created_by, created_at)
VALUES (3,
    'Reuniao de Equipe - Planejamento Mensal',
    'REUNIAO_EQUIPE',
    'Sala de Reunioes da UBS',
    '2025-03-05 14:00:00',
    '2025-03-05 16:00:00',
    false,
    'Pauta: Revisao dos indicadores de saude e planejamento de acoes do mes.',
    'MONTHLY',
    1,
    '2025-12-31',
    2,
    NOW()
);

-- Evento 2: Sala de vacina semanal (recorrente)
INSERT INTO cronograma_events (ubs_id, titulo, tipo, local, inicio, fim, dia_inteiro, observacoes, recorrencia, recorrencia_intervalo, recorrencia_fim, created_by, created_at)
VALUES (3,
    'Sala de Vacina - Atendimento Regular',
    'SALA_VACINA',
    'Sala de Vacina',
    '2025-03-03 08:00:00',
    '2025-03-03 16:00:00',
    false,
    'Atendimento de rotina. Trazer caderneta de vacinacao.',
    'WEEKLY',
    1,
    '2025-12-31',
    2,
    NOW()
);

-- Evento 3: Entrega de medicamentos na farmacia
INSERT INTO cronograma_events (ubs_id, titulo, tipo, local, inicio, fim, dia_inteiro, observacoes, recorrencia, recorrencia_intervalo, recorrencia_fim, created_by, created_at)
VALUES (3,
    'Entrega de Medicamentos - Farmacia Basica',
    'FARMACIA_BASICA',
    'Farmacia da UBS',
    '2025-03-10 09:00:00',
    '2025-03-10 12:00:00',
    false,
    'Conferir quantidade, validade e armazenamento adequado.',
    'MONTHLY',
    1,
    '2025-12-31',
    2,
    NOW()
);

-- Evento 4: Mutirao de vacinacao (evento unico)
INSERT INTO cronograma_events (ubs_id, titulo, tipo, local, inicio, fim, dia_inteiro, observacoes, recorrencia, recorrencia_intervalo, recorrencia_fim, created_by, created_at)
VALUES (3,
    'Mutirao de Vacinacao - Area Rural',
    'SALA_VACINA',
    'Escola Municipal da Baixa do Aragao',
    '2025-03-20 00:00:00',
    '2025-03-20 23:59:59',
    true,
    'Campanha especial para criancas com vacinas atrasadas na area rural. Equipe movel.',
    'NONE',
    1,
    NULL,
    2,
    NOW()
);

-- Evento 5: Grupo operativo de hipertensos (semanal)
INSERT INTO cronograma_events (ubs_id, titulo, tipo, local, inicio, fim, dia_inteiro, observacoes, recorrencia, recorrencia_intervalo, recorrencia_fim, created_by, created_at)
VALUES (3,
    'Grupo Operativo - Hipertensos e Diabeticos',
    'OUTRO',
    'Area externa da UBS',
    '2025-03-06 09:00:00',
    '2025-03-06 10:30:00',
    false,
    'Atividade educativa com aferimento de PA e glicemia capilar.',
    'WEEKLY',
    2,
    '2025-12-31',
    2,
    NOW()
);

-- Evento 6: Visita domiciliar ACS
INSERT INTO cronograma_events (ubs_id, titulo, tipo, local, inicio, fim, dia_inteiro, observacoes, recorrencia, recorrencia_intervalo, recorrencia_fim, created_by, created_at)
VALUES (3,
    'Visitas Domiciliares - ACS Microarea 1 a 4',
    'OUTRO',
    'Territorio da UBS',
    '2025-03-04 08:00:00',
    '2025-03-04 12:00:00',
    false,
    'Busca ativa de faltosos e acompanhamento de gestantes.',
    'WEEKLY',
    1,
    '2025-12-31',
    2,
    NOW()
);


-- ============================================================
-- 3. MATERIAIS EDUCATIVOS
-- ============================================================
-- Nota: Apenas metadados. Arquivos (PDFs, etc.) devem ser
-- enviados pela interface da plataforma apos a criacao.

-- Material 1: Protocolo de hipertensao
INSERT INTO educational_materials (ubs_id, titulo, descricao, categoria, publico_alvo, ativo, created_by, created_at)
VALUES (3,
    'Protocolo de Atendimento - Hipertensao Arterial',
    'Orientacoes para diagnostico, tratamento e acompanhamento de pacientes hipertensos na Atencao Basica conforme diretrizes do Ministerio da Saude.',
    'PNAB',
    'Profissionais',
    true,
    2,
    NOW()
);

-- Material 2: Cartilha de vacinacao
INSERT INTO educational_materials (ubs_id, titulo, descricao, categoria, publico_alvo, ativo, created_by, created_at)
VALUES (3,
    'Cartilha de Vacinacao - Calendario Nacional 2025',
    'Informacoes sobre o calendario nacional de vacinacao, vacinas disponiveis no SUS e orientacoes para pais e responsaveis.',
    'Imunizacao',
    'Usuarios',
    true,
    2,
    NOW()
);

-- Material 3: Manual e-SUS
INSERT INTO educational_materials (ubs_id, titulo, descricao, categoria, publico_alvo, ativo, created_by, created_at)
VALUES (3,
    'Manual de Uso do e-SUS AB',
    'Guia pratico para utilizacao do sistema e-SUS Atencao Basica, incluindo cadastro de cidadaos, registro de atendimentos e geracao de relatorios.',
    'e-SUS',
    'Profissionais',
    true,
    2,
    NOW()
);

-- Material 4: Guia de pre-natal
INSERT INTO educational_materials (ubs_id, titulo, descricao, categoria, publico_alvo, ativo, created_by, created_at)
VALUES (3,
    'Guia de Acompanhamento Pre-Natal',
    'Orientacoes para gestantes sobre consultas, exames, alimentacao e sinais de alerta durante a gravidez.',
    'Saude da Mulher',
    'Usuarios',
    true,
    2,
    NOW()
);

-- Material 5: Protocolo de diabetes
INSERT INTO educational_materials (ubs_id, titulo, descricao, categoria, publico_alvo, ativo, created_by, created_at)
VALUES (3,
    'Protocolo de Atendimento - Diabetes Mellitus',
    'Fluxo de atendimento, criterios de rastreamento, metas terapeuticas e encaminhamentos para pacientes diabeticos.',
    'PNAB',
    'Profissionais',
    true,
    2,
    NOW()
);

COMMIT;
