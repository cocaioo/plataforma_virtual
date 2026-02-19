import { useEffect, useMemo, useState } from 'react';
import {
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  PlusIcon,
  TrashIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import { api } from '../services/api';
import { useNotifications } from '../components/ui/Notifications';

const GUT_OPTIONS = [1, 2, 3, 4, 5];
const STATUS_OPTIONS = [
  { value: 'PLANEJADO', label: 'Planejado', tone: 'bg-slate-100 text-slate-700' },
  { value: 'EM_ANDAMENTO', label: 'Em andamento', tone: 'bg-amber-100 text-amber-800' },
  { value: 'CONCLUIDO', label: 'Concluído', tone: 'bg-emerald-100 text-emerald-700' },
];

const gutScore = (g, u, t) => Number(g || 0) * Number(u || 0) * Number(t || 0);

const scoreTone = (score) => {
  if (score >= 80) return 'bg-red-100 text-red-700';
  if (score >= 40) return 'bg-amber-100 text-amber-800';
  return 'bg-emerald-100 text-emerald-700';
};

const emptyProblemForm = {
  titulo: '',
  descricao: '',
  gut_gravidade: 1,
  gut_urgencia: 1,
  gut_tendencia: 1,
  is_prioritario: false,
};

const emptyInterventionForm = {
  objetivo: '',
  metas: '',
  responsavel: '',
  status: 'PLANEJADO',
};

const emptyActionForm = {
  acao: '',
  prazo: '',
  status: 'PLANEJADO',
  observacoes: '',
};

const MOCK_UBS_ADALTO = {
  id: 3,
  nome_ubs: 'ESF 41 - Adalto Parentes Sampaio',
  cnes: '0000000',
  area_atuacao: 'Baixa do Aragao, Parnaiba - PI',
  status: 'DRAFT',
};

const MapaProblemasIntervencoes = () => {
  const { notify, confirm } = useNotifications();
  const [ubsList, setUbsList] = useState([]);
  const [selectedUbsId, setSelectedUbsId] = useState('');
  const [problems, setProblems] = useState([]);
  const [selectedProblemId, setSelectedProblemId] = useState(null);
  const [interventions, setInterventions] = useState([]);
  const [selectedInterventionId, setSelectedInterventionId] = useState(null);
  const [actions, setActions] = useState([]);

  const [problemForm, setProblemForm] = useState(emptyProblemForm);
  const [problemEditForm, setProblemEditForm] = useState(null);
  const [interventionForm, setInterventionForm] = useState(emptyInterventionForm);
  const [interventionEditForm, setInterventionEditForm] = useState(null);
  const [actionForm, setActionForm] = useState(emptyActionForm);
  const [actionEditForm, setActionEditForm] = useState(null);

  const selectedProblem = useMemo(
    () => problems.find((item) => item.id === selectedProblemId) || null,
    [problems, selectedProblemId]
  );

  const selectedIntervention = useMemo(
    () => interventions.find((item) => item.id === selectedInterventionId) || null,
    [interventions, selectedInterventionId]
  );

  const loadUbs = async () => {
    try {
      const data = await api.request('/ubs?page=1&page_size=100', { requiresAuth: true });
      const items = data.items || [];
      const hasAdalto = items.some((u) => u.id === MOCK_UBS_ADALTO.id);
      const merged = hasAdalto ? items : [MOCK_UBS_ADALTO, ...items];
      setUbsList(merged);
      if (merged.length > 0) {
        setSelectedUbsId(String(merged[0].id));
      }
    } catch (error) {
      setUbsList([MOCK_UBS_ADALTO]);
      setSelectedUbsId(String(MOCK_UBS_ADALTO.id));
      notify({ type: 'error', message: 'Erro ao carregar UBS. Tente novamente.' });
    }
  };

  const loadProblems = async (ubsId) => {
    if (!ubsId) return;
    try {
      const data = await api.request(`/ubs/${ubsId}/problems`, { requiresAuth: true });
      const items = Array.isArray(data) ? data : [];
      setProblems(items);
      if (items.length > 0) {
        setSelectedProblemId(items[0].id);
      } else {
        setSelectedProblemId(null);
      }
      setProblemEditForm(null);
    } catch (error) {
      setProblems([]);
      setSelectedProblemId(null);
      notify({ type: 'error', message: 'Erro ao carregar problemas.' });
    }
  };

  const loadInterventions = async (problemId) => {
    if (!problemId) {
      setInterventions([]);
      setSelectedInterventionId(null);
      return;
    }
    try {
      const data = await api.request(`/ubs/problems/${problemId}/interventions`, {
        requiresAuth: true,
      });
      const items = Array.isArray(data) ? data : [];
      setInterventions(items);
      if (items.length > 0) {
        setSelectedInterventionId(items[0].id);
      } else {
        setSelectedInterventionId(null);
      }
      setInterventionEditForm(null);
    } catch (error) {
      setInterventions([]);
      setSelectedInterventionId(null);
      notify({ type: 'error', message: 'Erro ao carregar intervenções.' });
    }
  };

  const loadActions = async (interventionId) => {
    if (!interventionId) {
      setActions([]);
      return;
    }
    try {
      const data = await api.request(`/ubs/interventions/${interventionId}/actions`, {
        requiresAuth: true,
      });
      setActions(Array.isArray(data) ? data : []);
    } catch (error) {
      notify({ type: 'error', message: 'Erro ao carregar ações.' });
    }
  };

  useEffect(() => {
    loadUbs();
  }, []);

  useEffect(() => {
    if (!selectedUbsId) return;
    loadProblems(selectedUbsId);
  }, [selectedUbsId]);

  useEffect(() => {
    if (!selectedProblemId) {
      setInterventions([]);
      setSelectedInterventionId(null);
      return;
    }
    loadInterventions(selectedProblemId);
  }, [selectedProblemId]);

  useEffect(() => {
    loadActions(selectedInterventionId);
  }, [selectedInterventionId]);

  useEffect(() => {
    if (!selectedProblem) {
      setProblemEditForm(null);
      return;
    }
    setProblemEditForm({
      titulo: selectedProblem.titulo || '',
      descricao: selectedProblem.descricao || '',
      gut_gravidade: selectedProblem.gut_gravidade,
      gut_urgencia: selectedProblem.gut_urgencia,
      gut_tendencia: selectedProblem.gut_tendencia,
      is_prioritario: selectedProblem.is_prioritario,
    });
  }, [selectedProblem]);

  useEffect(() => {
    if (!selectedIntervention) {
      setInterventionEditForm(null);
      return;
    }
    setInterventionEditForm({
      objetivo: selectedIntervention.objetivo || '',
      metas: selectedIntervention.metas || '',
      responsavel: selectedIntervention.responsavel || '',
      status: selectedIntervention.status || 'PLANEJADO',
    });
  }, [selectedIntervention]);

  const handleCreateProblem = async (event) => {
    event.preventDefault();
    if (!selectedUbsId) return;
    try {
      await api.request(`/ubs/${selectedUbsId}/problems`, {
        method: 'POST',
        requiresAuth: true,
        body: {
          ...problemForm,
          gut_gravidade: Number(problemForm.gut_gravidade),
          gut_urgencia: Number(problemForm.gut_urgencia),
          gut_tendencia: Number(problemForm.gut_tendencia),
          is_prioritario: Boolean(problemForm.is_prioritario),
        },
      });
      notify({ type: 'success', message: 'Problema registrado.' });
      setProblemForm(emptyProblemForm);
      await loadProblems(selectedUbsId);
    } catch (error) {
      notify({ type: 'error', message: 'Erro ao salvar problema.' });
    }
  };

  const handleUpdateProblem = async () => {
    if (!selectedProblem || !problemEditForm) return;
    try {
      await api.request(`/ubs/problems/${selectedProblem.id}`, {
        method: 'PATCH',
        requiresAuth: true,
        body: {
          ...problemEditForm,
          gut_gravidade: Number(problemEditForm.gut_gravidade),
          gut_urgencia: Number(problemEditForm.gut_urgencia),
          gut_tendencia: Number(problemEditForm.gut_tendencia),
          is_prioritario: Boolean(problemEditForm.is_prioritario),
        },
      });
      notify({ type: 'success', message: 'Problema atualizado.' });
      await loadProblems(selectedUbsId);
    } catch (error) {
      notify({ type: 'error', message: 'Erro ao atualizar problema.' });
    }
  };

  const handleDeleteProblem = async (problemId) => {
    const confirmed = await confirm({
      title: 'Excluir problema',
      message: 'Tem certeza que deseja remover este problema?',
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
    });
    if (!confirmed) return;
    try {
      await api.request(`/ubs/problems/${problemId}`, {
        method: 'DELETE',
        requiresAuth: true,
      });
      notify({ type: 'success', message: 'Problema removido.' });
      await loadProblems(selectedUbsId);
    } catch (error) {
      notify({ type: 'error', message: 'Erro ao remover problema.' });
    }
  };

  const handleCreateIntervention = async (event) => {
    event.preventDefault();
    if (!selectedProblem) return;
    try {
      await api.request(`/ubs/problems/${selectedProblem.id}/interventions`, {
        method: 'POST',
        requiresAuth: true,
        body: interventionForm,
      });
      notify({ type: 'success', message: 'Intervenção criada.' });
      setInterventionForm(emptyInterventionForm);
      await loadInterventions(selectedProblem.id);
    } catch (error) {
      notify({ type: 'error', message: 'Erro ao criar intervenção.' });
    }
  };

  const handleUpdateIntervention = async () => {
    if (!selectedIntervention || !interventionEditForm) return;
    try {
      await api.request(`/ubs/interventions/${selectedIntervention.id}`, {
        method: 'PATCH',
        requiresAuth: true,
        body: interventionEditForm,
      });
      notify({ type: 'success', message: 'Intervenção atualizada.' });
      await loadInterventions(selectedProblem.id);
    } catch (error) {
      notify({ type: 'error', message: 'Erro ao atualizar intervenção.' });
    }
  };

  const handleDeleteIntervention = async (interventionId) => {
    const confirmed = await confirm({
      title: 'Excluir intervencao',
      message: 'Deseja remover esta intervencao?',
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
    });
    if (!confirmed) return;
    try {
      await api.request(`/ubs/interventions/${interventionId}`, {
        method: 'DELETE',
        requiresAuth: true,
      });
      notify({ type: 'success', message: 'Intervenção removida.' });
      await loadInterventions(selectedProblem.id);
    } catch (error) {
      notify({ type: 'error', message: 'Erro ao remover intervenção.' });
    }
  };

  const handleCreateAction = async (event) => {
    event.preventDefault();
    if (!selectedIntervention) return;
    try {
      await api.request(`/ubs/interventions/${selectedIntervention.id}/actions`, {
        method: 'POST',
        requiresAuth: true,
        body: actionForm,
      });
      notify({ type: 'success', message: 'Ação registrada.' });
      setActionForm(emptyActionForm);
      await loadActions(selectedIntervention.id);
    } catch (error) {
      notify({ type: 'error', message: 'Erro ao registrar ação.' });
    }
  };

  const handleUpdateAction = async () => {
    if (!actionEditForm || !actionEditForm.id) return;
    try {
      await api.request(`/ubs/intervention-actions/${actionEditForm.id}`, {
        method: 'PATCH',
        requiresAuth: true,
        body: {
          acao: actionEditForm.acao,
          prazo: actionEditForm.prazo || null,
          status: actionEditForm.status,
          observacoes: actionEditForm.observacoes,
        },
      });
      notify({ type: 'success', message: 'Ação atualizada.' });
      setActionEditForm(null);
      await loadActions(selectedIntervention.id);
    } catch (error) {
      notify({ type: 'error', message: 'Erro ao atualizar ação.' });
    }
  };

  const handleDeleteAction = async (actionId) => {
    const confirmed = await confirm({
      title: 'Excluir acao',
      message: 'Deseja remover esta acao?',
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
    });
    if (!confirmed) return;
    try {
      await api.request(`/ubs/intervention-actions/${actionId}`, {
        method: 'DELETE',
        requiresAuth: true,
      });
      notify({ type: 'success', message: 'Ação removida.' });
      await loadActions(selectedIntervention.id);
    } catch (error) {
      notify({ type: 'error', message: 'Erro ao remover ação.' });
    }
  };

  const problemScore = gutScore(
    problemForm.gut_gravidade,
    problemForm.gut_urgencia,
    problemForm.gut_tendencia
  );

  const problemEditScore = problemEditForm
    ? gutScore(
        problemEditForm.gut_gravidade,
        problemEditForm.gut_urgencia,
        problemEditForm.gut_tendencia
      )
    : 0;

  const problemStats = useMemo(() => {
    const total = problems.length;
    const prioridade = problems.filter((item) => item.is_prioritario).length;
    return { total, prioridade };
  }, [problems]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <section
          className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm rise-fade"
          style={{
            fontFamily: '"Space Grotesk", "Segoe UI", sans-serif',
          }}
        >
          <div
            className="absolute -right-20 -top-24 h-64 w-64 rounded-full opacity-40"
            style={{
              background:
                'radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.35), transparent 65%)',
            }}
          />
          <div
            className="absolute -bottom-28 left-10 h-64 w-64 rounded-full opacity-40"
            style={{
              background:
                'radial-gradient(circle at 30% 30%, rgba(16, 185, 129, 0.3), transparent 65%)',
            }}
          />
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                mapa estratégico
              </p>
              <h1
                className="mt-2 text-3xl font-semibold text-slate-900"
                style={{ fontFamily: '"Fraunces", serif' }}
              >
                Mapa de problemas e intervenções
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-600">
                Priorize desafios com a matriz GUT e organize intervenções com ações,
                responsáveis e prazos. Use o fluxo abaixo para manter tudo visível em um só lugar.
              </p>
            </div>
            <div className="flex flex-col gap-3 rounded-2xl bg-slate-900 px-6 py-5 text-white shadow-lg">
              <div className="flex items-center gap-3">
                <ChartBarIcon className="h-6 w-6 text-sky-300" />
                <div>
                  <p className="text-xs uppercase text-slate-300">Problemas ativos</p>
                  <p className="text-2xl font-semibold">{problemStats.total}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ClipboardDocumentCheckIcon className="h-6 w-6 text-emerald-300" />
                <div>
                  <p className="text-xs uppercase text-slate-300">Prioritários</p>
                  <p className="text-2xl font-semibold">{problemStats.prioridade}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-4 rise-fade stagger-1">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Selecione a UBS</h2>
              <p className="mt-2 text-sm text-slate-500">
                Escolha a unidade para visualizar e registrar problemas.
              </p>
              <select
                className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
                value={selectedUbsId}
                onChange={(event) => setSelectedUbsId(event.target.value)}
              >
                {ubsList.length === 0 && <option value="">Nenhuma UBS encontrada</option>}
                {ubsList.map((ubs) => (
                  <option key={ubs.id} value={ubs.id}>
                    {ubs.nome_ubs || `UBS ${ubs.id}`}
                  </option>
                ))}
              </select>

              <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                Crie ao menos um problema para liberar o plano de intervenção.
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">Novo problema (GUT)</h3>
              <form className="mt-4 space-y-4" onSubmit={handleCreateProblem}>
                <input
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  placeholder="Título do problema"
                  value={problemForm.titulo}
                  onChange={(event) =>
                    setProblemForm((prev) => ({ ...prev, titulo: event.target.value }))
                  }
                  required
                />
                <textarea
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  rows={3}
                  placeholder="Descrição resumida"
                  value={problemForm.descricao}
                  onChange={(event) =>
                    setProblemForm((prev) => ({ ...prev, descricao: event.target.value }))
                  }
                />
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-slate-500">Gravidade</label>
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
                      value={problemForm.gut_gravidade}
                      onChange={(event) =>
                        setProblemForm((prev) => ({
                          ...prev,
                          gut_gravidade: Number(event.target.value),
                        }))
                      }
                    >
                      {GUT_OPTIONS.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-500">Urgência</label>
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
                      value={problemForm.gut_urgencia}
                      onChange={(event) =>
                        setProblemForm((prev) => ({
                          ...prev,
                          gut_urgencia: Number(event.target.value),
                        }))
                      }
                    >
                      {GUT_OPTIONS.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-500">Tendência</label>
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
                      value={problemForm.gut_tendencia}
                      onChange={(event) =>
                        setProblemForm((prev) => ({
                          ...prev,
                          gut_tendencia: Number(event.target.value),
                        }))
                      }
                    >
                      {GUT_OPTIONS.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={problemForm.is_prioritario}
                    onChange={(event) =>
                      setProblemForm((prev) => ({
                        ...prev,
                        is_prioritario: event.target.checked,
                      }))
                    }
                  />
                  Marcar como prioritario
                </label>
                <div className="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
                  <span>Score GUT</span>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${scoreTone(problemScore)}`}>
                    {problemScore}
                  </span>
                </div>
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  <PlusIcon className="h-4 w-4" />
                  Registrar problema
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-6 rise-fade stagger-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Problemas cadastrados</h2>
                  <p className="text-sm text-slate-500">Clique para editar e priorizar.</p>
                </div>
              </div>

              {problems.length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                  Nenhum problema registrado ainda.
                </div>
              ) : (
                <div className="mt-6 grid grid-cols-1 gap-3">
                  {problems.map((problem) => (
                    <button
                      key={problem.id}
                      onClick={() => setSelectedProblemId(problem.id)}
                      className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                        problem.id === selectedProblemId
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold">{problem.titulo}</p>
                        <p
                          className={`text-xs ${
                            problem.id === selectedProblemId ? 'text-slate-200' : 'text-slate-500'
                          }`}
                        >
                          {problem.descricao || 'Sem descrição'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {problem.is_prioritario && (
                          <span
                            className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                              problem.id === selectedProblemId
                                ? 'bg-white/20 text-white'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            Prioritário
                          </span>
                        )}
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            problem.id === selectedProblemId
                              ? 'bg-white/20 text-white'
                              : scoreTone(problem.gut_score)
                          }`}
                        >
                          {problem.gut_score}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedProblem && problemEditForm && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-900">Editar problema</h3>
                  <button
                    onClick={() => handleDeleteProblem(selectedProblem.id)}
                    className="flex items-center gap-2 text-xs font-semibold text-red-600"
                  >
                    <TrashIcon className="h-4 w-4" />
                    Excluir
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={problemEditForm.titulo}
                    onChange={(event) =>
                      setProblemEditForm((prev) => ({ ...prev, titulo: event.target.value }))
                    }
                  />
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={problemEditForm.descricao}
                    onChange={(event) =>
                      setProblemEditForm((prev) => ({ ...prev, descricao: event.target.value }))
                    }
                    placeholder="Descrição"
                  />
                  <div className="grid grid-cols-3 gap-3 lg:col-span-2">
                    {['gut_gravidade', 'gut_urgencia', 'gut_tendencia'].map((field) => (
                      <select
                        key={field}
                        className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
                        value={problemEditForm[field]}
                        onChange={(event) =>
                          setProblemEditForm((prev) => ({
                            ...prev,
                            [field]: Number(event.target.value),
                          }))
                        }
                      >
                        {GUT_OPTIONS.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={problemEditForm.is_prioritario}
                      onChange={(event) =>
                        setProblemEditForm((prev) => ({
                          ...prev,
                          is_prioritario: event.target.checked,
                        }))
                      }
                    />
                    Prioritário
                  </label>
                  <div className="flex items-center justify-end lg:col-span-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${scoreTone(problemEditScore)}`}>
                      Score {problemEditScore}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleUpdateProblem}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  <PencilSquareIcon className="h-4 w-4" />
                  Salvar alterações
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">Intervenções</h3>
                <p className="text-sm text-slate-500">
                  {selectedProblem
                    ? 'Defina objetivos e metas para o problema selecionado.'
                    : 'Selecione um problema para liberar esta etapa.'}
                </p>

                {interventions.length === 0 && (
                  <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                    Nenhuma intervenção registrada.
                  </div>
                )}

                <div className="mt-4 space-y-2">
                  {interventions.map((intervention) => (
                    <button
                      key={intervention.id}
                      onClick={() => setSelectedInterventionId(intervention.id)}
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm ${
                        intervention.id === selectedInterventionId
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200'
                      }`}
                    >
                      <span className="font-medium">{intervention.objetivo}</span>
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                          intervention.id === selectedInterventionId
                            ? 'bg-white/20 text-white'
                            : STATUS_OPTIONS.find((item) => item.value === intervention.status)?.tone
                        }`}
                      >
                        {STATUS_OPTIONS.find((item) => item.value === intervention.status)?.label}
                      </span>
                    </button>
                  ))}
                </div>

                <form
                  className="mt-6 space-y-3"
                  onSubmit={handleCreateIntervention}
                >
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Objetivo da intervenção"
                    value={interventionForm.objetivo}
                    onChange={(event) =>
                      setInterventionForm((prev) => ({ ...prev, objetivo: event.target.value }))
                    }
                    required
                    disabled={!selectedProblem}
                  />
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Metas"
                    value={interventionForm.metas}
                    onChange={(event) =>
                      setInterventionForm((prev) => ({ ...prev, metas: event.target.value }))
                    }
                    disabled={!selectedProblem}
                  />
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Responsável"
                    value={interventionForm.responsavel}
                    onChange={(event) =>
                      setInterventionForm((prev) => ({ ...prev, responsavel: event.target.value }))
                    }
                    disabled={!selectedProblem}
                  />
                  <select
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={interventionForm.status}
                    onChange={(event) =>
                      setInterventionForm((prev) => ({ ...prev, status: event.target.value }))
                    }
                    disabled={!selectedProblem}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-300"
                    disabled={!selectedProblem}
                  >
                    <PlusIcon className="h-4 w-4" />
                    Adicionar intervenção
                  </button>
                </form>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">Detalhes e ações</h3>
                <p className="text-sm text-slate-500">
                  {selectedIntervention
                    ? 'Atualize status e acompanhe as ações planejadas.'
                    : 'Selecione uma intervenção para editar.'}
                </p>

                {selectedIntervention && interventionEditForm ? (
                  <div className="mt-4 space-y-3">
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={interventionEditForm.objetivo}
                      onChange={(event) =>
                        setInterventionEditForm((prev) => ({
                          ...prev,
                          objetivo: event.target.value,
                        }))
                      }
                    />
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={interventionEditForm.metas}
                      onChange={(event) =>
                        setInterventionEditForm((prev) => ({ ...prev, metas: event.target.value }))
                      }
                    />
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={interventionEditForm.responsavel}
                      onChange={(event) =>
                        setInterventionEditForm((prev) => ({
                          ...prev,
                          responsavel: event.target.value,
                        }))
                      }
                    />
                    <select
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={interventionEditForm.status}
                      onChange={(event) =>
                        setInterventionEditForm((prev) => ({
                          ...prev,
                          status: event.target.value,
                        }))
                      }
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center justify-between">
                      <button
                        onClick={handleUpdateIntervention}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                        Salvar intervenção
                      </button>
                      <button
                        onClick={() => handleDeleteIntervention(selectedIntervention.id)}
                        className="text-xs font-semibold text-red-600"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                    Selecione uma intervenção para editar.
                  </div>
                )}

                <div className="mt-6 border-t border-slate-100 pt-5">
                  <h4 className="text-sm font-semibold text-slate-900">Ações</h4>
                  {actions.length === 0 && (
                    <p className="mt-2 text-xs text-slate-500">Nenhuma ação registrada.</p>
                  )}
                  <div className="mt-3 space-y-2">
                    {actions.map((action) => (
                      <div
                        key={action.id}
                        className="rounded-xl border border-slate-200 px-3 py-3"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-slate-900">{action.acao}</p>
                          <span
                            className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                              STATUS_OPTIONS.find((item) => item.value === action.status)?.tone
                            }`}
                          >
                            {STATUS_OPTIONS.find((item) => item.value === action.status)?.label}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          Prazo: {action.prazo || 'Não informado'}
                        </p>
                        {action.observacoes && (
                          <p className="mt-1 text-xs text-slate-400">{action.observacoes}</p>
                        )}
                        <div className="mt-2 flex gap-3 text-xs">
                          <button
                            onClick={() =>
                              setActionEditForm({
                                id: action.id,
                                acao: action.acao,
                                prazo: action.prazo || '',
                                status: action.status || 'PLANEJADO',
                                observacoes: action.observacoes || '',
                              })
                            }
                            className="text-slate-600"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteAction(action.id)}
                            className="text-red-600"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {actionEditForm && (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <h5 className="text-xs font-semibold text-slate-700">Editar ação</h5>
                      <div className="mt-3 space-y-2">
                        <input
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                          value={actionEditForm.acao}
                          onChange={(event) =>
                            setActionEditForm((prev) => ({ ...prev, acao: event.target.value }))
                          }
                        />
                        <input
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                          type="date"
                          value={actionEditForm.prazo}
                          onChange={(event) =>
                            setActionEditForm((prev) => ({ ...prev, prazo: event.target.value }))
                          }
                        />
                        <select
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                          value={actionEditForm.status}
                          onChange={(event) =>
                            setActionEditForm((prev) => ({ ...prev, status: event.target.value }))
                          }
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                        <textarea
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                          rows={2}
                          value={actionEditForm.observacoes}
                          onChange={(event) =>
                            setActionEditForm((prev) => ({
                              ...prev,
                              observacoes: event.target.value,
                            }))
                          }
                          placeholder="Observações"
                        />
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <button
                          onClick={handleUpdateAction}
                          className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                        >
                          Salvar ação
                        </button>
                        <button
                          onClick={() => setActionEditForm(null)}
                          className="text-xs text-slate-500"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  <form className="mt-4 space-y-2" onSubmit={handleCreateAction}>
                    <input
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      placeholder="Nova ação"
                      value={actionForm.acao}
                      onChange={(event) =>
                        setActionForm((prev) => ({ ...prev, acao: event.target.value }))
                      }
                      required
                      disabled={!selectedIntervention}
                    />
                    <input
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      type="date"
                      value={actionForm.prazo}
                      onChange={(event) =>
                        setActionForm((prev) => ({ ...prev, prazo: event.target.value }))
                      }
                      disabled={!selectedIntervention}
                    />
                    <select
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={actionForm.status}
                      onChange={(event) =>
                        setActionForm((prev) => ({ ...prev, status: event.target.value }))
                      }
                      disabled={!selectedIntervention}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                    <textarea
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      rows={2}
                      placeholder="Observações"
                      value={actionForm.observacoes}
                      onChange={(event) =>
                        setActionForm((prev) => ({ ...prev, observacoes: event.target.value }))
                      }
                      disabled={!selectedIntervention}
                    />
                    <button
                      type="submit"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-300"
                      disabled={!selectedIntervention}
                    >
                      <PlusIcon className="h-4 w-4" />
                      Adicionar ação
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default MapaProblemasIntervencoes;
