import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNotifications } from '../components/ui/Notifications';
import { gestaoEquipesService } from '../services/gestaoEquipesService';
import { api } from '../services/api';
import { ubsService } from '../services/ubsService';
import {
  UsersIcon,
  HomeModernIcon,
  MapIcon,
  ChartBarIcon,
  UserCircleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ─── Fix para ícones do Leaflet com bundlers (Vite/Webpack) ─────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─── Dados mockados (fallback caso a API não responda) ─────────────
const MOCK_KPIS = {
  populacao_adscrita: 12450,
  familias_cadastradas: 3280,
  microareas_descobertas: 2,
  cobertura_esf: 85,
};

const MOCK_AGENTES = [
  { id: 1, nome: 'Maria Jose da Silva', microarea_nome: 'Microárea 01 - Baixa do Aragão' },
  { id: 2, nome: 'Francisco Alves de Sousa', microarea_nome: 'Microárea 02 - Centro' },
  { id: 3, nome: 'Ana Claudia Ferreira', microarea_nome: 'Microárea 03 - Piauí' },
  { id: 4, nome: 'Jose Ribamar Costa', microarea_nome: 'Microárea 04 - Frei Higino' },
  { id: 5, nome: 'Francisca das Chagas Lima', microarea_nome: 'Microárea 05 - Pindorama' },
];

const MAP_CENTER = [-2.9045, -41.7745];
const MAP_ZOOM = 13;

const EMPTY_MICROAREA_FORM = {
  nome: '',
  status: 'COBERTA',
  populacao: '',
  familias: '',
  geojson: '',
};

const EMPTY_AGENTE_FORM = {
  usuario_id: '',
  microarea_id: '',
  ativo: true,
};

const isValidId = (value) => Number.isInteger(Number(value)) && Number(value) > 0;

const Modal = ({ open, title, children, onClose, footer }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
        <div className="relative border-b border-slate-100 px-5 py-4 flex items-center">
          <h3 className="text-base font-semibold text-slate-900 text-center w-full">{title}</h3>
          <button
            onClick={onClose}
            className="absolute right-5 top-1/2 -translate-y-1/2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Fechar
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="px-5 pb-5">{footer}</div>}
      </div>
    </div>
  );
};

const Field = ({ label, children }) => (
  <label className="block">
    <span className="text-xs font-semibold text-slate-600">{label}</span>
    <div className="mt-2">{children}</div>
  </label>
);

// ─── Componente KPI Card ────────────────────────────────────────────
const KpiCard = ({ icon: Icon, value, label, color }) => (
  <div className="bg-white dark:bg-slate-900 shadow-md rounded-lg p-5 flex items-center gap-4 border border-gray-100 dark:border-slate-800">
    <div className={`flex-shrink-0 p-3 rounded-lg ${color}`}>
      <Icon className="h-6 w-6 text-white" />
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-sm text-gray-500 dark:text-slate-400">{label}</p>
    </div>
  </div>
);

// ─── Componente Principal ───────────────────────────────────────────
const GestaoEquipesMicroareas = () => {
  const { notify } = useNotifications();
  const currentUser = api.getCurrentUser();
  const canEdit = useMemo(() => {
    const role = (currentUser?.role || 'USER').toUpperCase();
    return ['GESTOR', 'RECEPCAO'].includes(role);
  }, [currentUser]);

  const [kpis, setKpis] = useState(MOCK_KPIS);
  const [agentes, setAgentes] = useState(MOCK_AGENTES);
  const [microareas, setMicroareas] = useState([]);
  const [acsUsers, setAcsUsers] = useState([]);
  const [selectedUbsId, setSelectedUbsId] = useState('');
  const [ubsInfo, setUbsInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usingMockData, setUsingMockData] = useState(false);

  const [microareaModalOpen, setMicroareaModalOpen] = useState(false);
  const [microareaModalMode, setMicroareaModalMode] = useState('create');
  const [microareaForm, setMicroareaForm] = useState(EMPTY_MICROAREA_FORM);
  const [microareaEditingId, setMicroareaEditingId] = useState(null);
  const [savingMicroarea, setSavingMicroarea] = useState(false);

  const [agenteModalOpen, setAgenteModalOpen] = useState(false);
  const [agenteModalMode, setAgenteModalMode] = useState('create');
  const [agenteForm, setAgenteForm] = useState(EMPTY_AGENTE_FORM);
  const [agenteEditingId, setAgenteEditingId] = useState(null);
  const [savingAgente, setSavingAgente] = useState(false);
  const [showAcsForm, setShowAcsForm] = useState(false);
  const [acsForm, setAcsForm] = useState({ nome: '', email: '', cpf: '', senha: '' });
  const [savingAcs, setSavingAcs] = useState(false);

  const loadCatalogs = useCallback(async () => {
    try {
      const [ubsData, acsData] = await Promise.all([
        ubsService.getSingleUbs(),
        gestaoEquipesService.getAcsUsers(),
      ]);
      setAcsUsers(Array.isArray(acsData) ? acsData : []);
      setUbsInfo(ubsData);
      setSelectedUbsId(ubsData ? String(ubsData.id) : '');
    } catch (error) {
      notify({ type: 'warning', message: error.message || 'Não foi possível carregar a UBS.' });
    }
  }, [notify]);

  const loadData = useCallback(async () => {
    if (!selectedUbsId) return;
    setLoading(true);
    setUsingMockData(false);
    try {
      const [kpisData, agentesData, microareasData] = await Promise.all([
        gestaoEquipesService.getKpis({ ubs_id: selectedUbsId }),
        gestaoEquipesService.getAgentes({ ubs_id: selectedUbsId }),
        gestaoEquipesService.getMicroareas({ ubs_id: selectedUbsId }),
      ]);
      setKpis(kpisData || MOCK_KPIS);
      setAgentes(Array.isArray(agentesData) && agentesData.length > 0 ? agentesData : []);
      setMicroareas(Array.isArray(microareasData) ? microareasData : []);
    } catch {
      setKpis(MOCK_KPIS);
      setAgentes(MOCK_AGENTES);
      setMicroareas([]);
      setUsingMockData(true);
      notify({ type: 'warning', message: 'Usando dados de demonstração. Conexão com o servidor indisponível.' });
    } finally {
      setLoading(false);
    }
  }, [notify, selectedUbsId]);

  useEffect(() => {
    loadCatalogs();
  }, [loadCatalogs]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const microareaAgents = useMemo(() => {
    const map = new Map();
    agentes.forEach((agente) => {
      if (!agente.microarea_id) return;
      const list = map.get(agente.microarea_id) || [];
      if (agente.nome) list.push(agente.nome);
      map.set(agente.microarea_id, list);
    });
    return map;
  }, [agentes]);
  const microareasCobertas = useMemo(
    () => microareas.filter((microarea) => microarea.status === 'COBERTA').length,
    [microareas]
  );

  const openNewMicroarea = () => {
    setMicroareaForm(EMPTY_MICROAREA_FORM);
    setMicroareaModalMode('create');
    setMicroareaEditingId(null);
    setMicroareaModalOpen(true);
  };

  const openEditMicroarea = (microarea) => {
    setMicroareaForm({
      nome: microarea.nome ?? '',
      status: microarea.status ?? 'COBERTA',
      populacao: microarea.populacao ?? 0,
      familias: microarea.familias ?? 0,
      geojson: microarea.geojson ? JSON.stringify(microarea.geojson) : '',
    });
    setMicroareaModalMode('edit');
    setMicroareaEditingId(microarea.id);
    setMicroareaModalOpen(true);
  };

  const openNewAgente = () => {
    setAgenteForm(EMPTY_AGENTE_FORM);
    setAgenteModalMode('create');
    setAgenteEditingId(null);
    setShowAcsForm(false);
    setAcsForm({ nome: '', email: '', cpf: '', senha: '' });
    setAgenteModalOpen(true);
  };

  const openEditAgente = (agente) => {
    setAgenteForm({
      usuario_id: agente.usuario_id ?? '',
      microarea_id: agente.microarea_id ?? '',
      ativo: agente.ativo ?? true,
    });
    setAgenteModalMode('edit');
    setAgenteEditingId(agente.id);
    setShowAcsForm(false);
    setAgenteModalOpen(true);
  };

  const handleCreateAcs = async () => {
    if (!canEdit || usingMockData) {
      notify({ type: 'warning', message: 'Edição indisponível para este usuário ou em modo de demonstração.' });
      return;
    }

    if (!acsForm.nome || !acsForm.email || !acsForm.cpf || !acsForm.senha) {
      notify({ type: 'warning', message: 'Preencha nome, email, CPF e senha do ACS.' });
      return;
    }

    try {
      setSavingAcs(true);
      const novo = await api.request('/auth/acs-users', {
        method: 'POST',
        requiresAuth: true,
        body: {
          nome: acsForm.nome,
          email: acsForm.email,
          cpf: acsForm.cpf,
          senha: acsForm.senha,
        },
      });
      notify({ type: 'success', message: 'ACS cadastrado com sucesso.' });
      setAcsForm({ nome: '', email: '', cpf: '', senha: '' });
      setShowAcsForm(false);
      const refreshed = await gestaoEquipesService.getAcsUsers();
      setAcsUsers(Array.isArray(refreshed) ? refreshed : []);
      if (novo?.id) {
        setAgenteForm((prev) => ({ ...prev, usuario_id: String(novo.id) }));
      }
    } catch (error) {
      notify({ type: 'error', message: error.message || 'Erro ao cadastrar ACS.' });
    } finally {
      setSavingAcs(false);
    }
  };

  const buildMicroareaPayload = () => {
    const payload = {
      nome: microareaForm.nome.trim(),
      status: microareaForm.status,
      populacao: Number(microareaForm.populacao || 0),
      familias: Number(microareaForm.familias || 0),
    };

    if (microareaModalMode === 'create') {
      payload.ubs_id = Number(selectedUbsId);
    }

    if (microareaForm.geojson && microareaForm.geojson.trim()) {
      try {
        payload.geojson = JSON.parse(microareaForm.geojson);
      } catch {
        throw new Error('GeoJSON inválido.');
      }
    }

    return payload;
  };

  const handleSaveMicroarea = async () => {
    if (!canEdit || usingMockData) {
      notify({ type: 'warning', message: 'Edição indisponível para este usuário ou em modo de demonstração.' });
      return;
    }

    if (!isValidId(selectedUbsId)) {
      notify({ type: 'error', message: 'Selecione uma UBS válida.' });
      return;
    }

    if (!microareaForm.nome.trim()) {
      notify({ type: 'error', message: 'O nome da microárea é obrigatório.' });
      return;
    }

    try {
      setSavingMicroarea(true);
      const payload = buildMicroareaPayload();

      if (microareaModalMode === 'create') {
        await gestaoEquipesService.createMicroarea(payload);
        notify({ type: 'success', message: 'Microárea criada com sucesso.' });
      } else if (microareaEditingId) {
        await gestaoEquipesService.updateMicroarea(microareaEditingId, payload);
        notify({ type: 'success', message: 'Microárea atualizada com sucesso.' });
      }

      setMicroareaModalOpen(false);
      await loadData();
    } catch (error) {
      notify({ type: 'error', message: error.message || 'Erro ao salvar microárea.' });
    } finally {
      setSavingMicroarea(false);
    }
  };

  const handleSaveAgente = async () => {
    if (!canEdit || usingMockData) {
      notify({ type: 'warning', message: 'Edição indisponível para este usuário ou em modo de demonstração.' });
      return;
    }

    if (!isValidId(agenteForm.usuario_id)) {
      notify({ type: 'error', message: 'Selecione um ACS válido.' });
      return;
    }

    if (!isValidId(agenteForm.microarea_id)) {
      notify({ type: 'error', message: 'Selecione uma microárea válida.' });
      return;
    }

    try {
      setSavingAgente(true);
      const payload = {
        usuario_id: Number(agenteForm.usuario_id),
        microarea_id: Number(agenteForm.microarea_id),
        ativo: Boolean(agenteForm.ativo),
      };

      if (agenteModalMode === 'create') {
        await gestaoEquipesService.createAgente(payload);
        notify({ type: 'success', message: 'Agente criado com sucesso.' });
      } else if (agenteEditingId) {
        await gestaoEquipesService.updateAgente(agenteEditingId, payload);
        notify({ type: 'success', message: 'Agente atualizado com sucesso.' });
      }

      setAgenteModalOpen(false);
      await loadData();
    } catch (error) {
      notify({ type: 'error', message: error.message || 'Erro ao salvar agente.' });
    } finally {
      setSavingAgente(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 rise-fade">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Gerenciar agentes e microáreas
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
          Edite microáreas e agentes. Os indicadores são calculados automaticamente.
        </p>
        {ubsInfo && (
          <p className="mt-3 text-sm text-gray-600 dark:text-slate-300">
            UBS: <strong>{ubsInfo.nome_ubs}</strong>
          </p>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      )}

      {!loading && !selectedUbsId && (
        <div className="bg-white dark:bg-slate-900 shadow-md rounded-lg p-6">
          <p className="text-gray-600 dark:text-slate-300">
            Nenhuma UBS configurada. Finalize a configuração inicial para continuar.
          </p>
        </div>
      )}

      {!loading && selectedUbsId && (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8 rise-fade stagger-1">
            <KpiCard
              icon={UsersIcon}
              value={(kpis.populacao_adscrita || 0).toLocaleString('pt-BR')}
              label="População Adscrita"
              color="bg-blue-600"
            />
            <KpiCard
              icon={HomeModernIcon}
              value={(kpis.familias_cadastradas || 0).toLocaleString('pt-BR')}
              label="Famílias Cadastradas"
              color="bg-emerald-600"
            />
            <KpiCard
              icon={MapIcon}
              value={kpis.microareas_descobertas || 0}
              label="Microáreas Descobertas"
              color="bg-amber-500"
            />
            <KpiCard
              icon={CheckCircleIcon}
              value={microareasCobertas}
              label="Microáreas Cobertas"
              color="bg-emerald-600"
            />
            <KpiCard
              icon={ChartBarIcon}
              value={`${kpis.cobertura_esf || 0}%`}
              label="Cobertura ESF"
              color="bg-violet-600"
            />
          </section>

          <section className="mb-8 rise-fade stagger-2">
            <div className="bg-white dark:bg-slate-900 shadow-md rounded-lg overflow-hidden">
              <div className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <UserCircleIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    <div>
                      <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                        Agentes Comunitários de Saúde
                      </h2>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                        {agentes.length} agentes
                      </p>
                    </div>
                  </div>
                  {canEdit && !usingMockData && (
                    <button
                      onClick={openNewAgente}
                      className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-700"
                    >
                      Gerenciar agentes
                    </button>
                  )}
                </div>
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                  <thead className="bg-gray-50 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Agente de Saúde
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Microárea
                      </th>
                      {canEdit && !usingMockData && (
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                          Ações
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {agentes.map((agente) => (
                      <tr key={agente.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                              <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                                {(agente.nome || '').split(' ').map((n) => n[0]).slice(0, 2).join('')}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {agente.nome}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-slate-300">
                          {agente.microarea_nome || agente.microarea}
                        </td>
                        {canEdit && !usingMockData && (
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <button
                              onClick={() => openEditAgente(agente)}
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                            >
                              Editar
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden p-4 space-y-3">
                {agentes.map((agente) => (
                  <div
                    key={agente.id}
                    className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                        <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                          {(agente.nome || '').split(' ').map((n) => n[0]).slice(0, 2).join('')}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {agente.nome}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {agente.microarea_nome || agente.microarea}
                    </p>
                    {canEdit && !usingMockData && (
                      <button
                        onClick={() => openEditAgente(agente)}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Editar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mb-8 rise-fade stagger-2">
            <div className="bg-white dark:bg-slate-900 shadow-md rounded-lg overflow-hidden">
              <div className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Microáreas</h2>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                      {microareas.length} microáreas cadastradas
                    </p>
                  </div>
                  {canEdit && !usingMockData && (
                    <button
                      onClick={openNewMicroarea}
                      className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-700"
                    >
                      Gerenciar microáreas
                    </button>
                  )}
                </div>
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                  <thead className="bg-gray-50 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Microárea
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Agentes responsáveis
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Famílias
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        População
                      </th>
                      {canEdit && !usingMockData && (
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                          Ações
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {microareas.map((microarea) => (
                      <tr key={microarea.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {microarea.nome}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-slate-300">
                          {microarea.status}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-slate-300">
                          {(microareaAgents.get(microarea.id) || []).join(', ') || 'Não definido'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-600 dark:text-slate-300">
                          {microarea.familias}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-600 dark:text-slate-300">
                          {microarea.populacao}
                        </td>
                        {canEdit && !usingMockData && (
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <button
                              onClick={() => openEditMicroarea(microarea)}
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                            >
                              Editar
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden p-4 space-y-3">
                {microareas.map((microarea) => (
                  <div
                    key={microarea.id}
                    className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {microarea.nome}
                      </p>
                      <span className="text-xs text-gray-500 dark:text-slate-400">{microarea.status}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {(microareaAgents.get(microarea.id) || []).join(', ') || 'Não definido'}
                    </p>
                    <div className="flex gap-3 text-xs text-gray-500 dark:text-slate-400">
                      <span>{microarea.familias} famílias</span>
                      <span>{microarea.populacao} pessoas</span>
                    </div>
                    {canEdit && !usingMockData && (
                      <button
                        onClick={() => openEditMicroarea(microarea)}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Editar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rise-fade stagger-3">
            <div className="bg-white dark:bg-slate-900 shadow-md rounded-lg overflow-hidden">
              <div className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4">
                <div className="flex items-center gap-3">
                  <MapIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                      Mapa do Território
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                      Parnaíba - PI &middot; Área de atuação da ESF
                    </p>
                  </div>
                </div>
              </div>

              <div className="h-[400px] lg:h-[500px]">
                <MapContainer
                  center={MAP_CENTER}
                  zoom={MAP_ZOOM}
                  scrollWheelZoom={true}
                  className="h-full w-full z-0"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={MAP_CENTER}>
                    <Popup>
                      <strong>ESF 41 - Adalto Parentes Sampaio</strong>
                      <br />
                      Parnaíba - PI
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
            </div>
          </section>
        </>
      )}

      <Modal
        open={microareaModalOpen}
        title={microareaModalMode === 'create' ? 'Nova microárea' : 'Editar microárea'}
        onClose={() => setMicroareaModalOpen(false)}
        footer={(
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setMicroareaModalOpen(false)}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveMicroarea}
              disabled={savingMicroarea}
              className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-60"
            >
              {savingMicroarea ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        )}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nome">
            <input
              type="text"
              value={microareaForm.nome}
              onChange={(event) => setMicroareaForm((prev) => ({ ...prev, nome: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              placeholder="Microárea 01 - Centro"
            />
          </Field>
          <Field label="Status">
            <select
              value={microareaForm.status}
              onChange={(event) => setMicroareaForm((prev) => ({ ...prev, status: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            >
              <option value="COBERTA">COBERTA</option>
              <option value="DESCOBERTA">DESCOBERTA</option>
            </select>
          </Field>
          <Field label="População">
            <input
              type="number"
              value={microareaForm.populacao}
              onChange={(event) => setMicroareaForm((prev) => ({ ...prev, populacao: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              placeholder="Ex.: 2100"
            />
          </Field>
          <Field label="Famílias">
            <input
              type="number"
              value={microareaForm.familias}
              onChange={(event) => setMicroareaForm((prev) => ({ ...prev, familias: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              placeholder="Ex.: 210"
            />
          </Field>
          <Field label="GeoJSON (opcional)">
            <textarea
              value={microareaForm.geojson}
              onChange={(event) => setMicroareaForm((prev) => ({ ...prev, geojson: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              rows={3}
              placeholder='{"type":"Polygon",...}'
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={agenteModalOpen}
        title={agenteModalMode === 'create' ? 'Gerenciar agentes da microárea' : 'Editar agente'}
        onClose={() => setAgenteModalOpen(false)}
        footer={(
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setAgenteModalOpen(false)}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveAgente}
              disabled={savingAgente}
              className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-60"
            >
              {savingAgente ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        )}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="ACS responsável">
            <select
              value={agenteForm.usuario_id}
              onChange={(event) => setAgenteForm((prev) => ({ ...prev, usuario_id: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Selecione</option>
              {acsUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.nome} ({user.email})
                </option>
              ))}
            </select>
          </Field>
          {canEdit && !usingMockData && (
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setShowAcsForm((prev) => !prev)}
                className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                {showAcsForm ? 'Fechar cadastro ACS' : 'Cadastrar novo ACS'}
              </button>
            </div>
          )}
          <Field label="Microárea">
            <select
              value={agenteForm.microarea_id}
              onChange={(event) => setAgenteForm((prev) => ({ ...prev, microarea_id: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Selecione</option>
              {microareas.map((microarea) => (
                <option key={microarea.id} value={microarea.id}>
                  {microarea.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ativo">
            <select
              value={agenteForm.ativo ? 'true' : 'false'}
              onChange={(event) => setAgenteForm((prev) => ({ ...prev, ativo: event.target.value === 'true' }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="true">Sim</option>
              <option value="false">Não</option>
            </select>
          </Field>
        </div>
        {showAcsForm && (
          <div className="mt-6 rounded-lg border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-500 mb-3">Cadastrar ACS</p>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Nome">
                <input
                  type="text"
                  value={acsForm.nome}
                  onChange={(event) => setAcsForm((prev) => ({ ...prev, nome: event.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Nome completo"
                />
                <p className="mt-2 text-xs text-slate-500">Use apenas letras e espaços.</p>
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={acsForm.email}
                  onChange={(event) => setAcsForm((prev) => ({ ...prev, email: event.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="email@domínio.com"
                />
                <p className="mt-2 text-xs text-slate-500">Informe um email válido.</p>
              </Field>
              <Field label="CPF">
                <input
                  type="text"
                  value={acsForm.cpf}
                  onChange={(event) => setAcsForm((prev) => ({ ...prev, cpf: event.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="000.000.000-00"
                />
                <p className="mt-2 text-xs text-slate-500">CPF válido (somente números ou com pontuação).</p>
              </Field>
              <Field label="Senha">
                <input
                  type="password"
                  value={acsForm.senha}
                  onChange={(event) => setAcsForm((prev) => ({ ...prev, senha: event.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Mínimo 8 caracteres"
                />
                <p className="mt-2 text-xs text-slate-500">Mínimo 8 caracteres, com letra maiúscula, minúscula e número.</p>
              </Field>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleCreateAcs}
                disabled={savingAcs}
                className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-60"
              >
                {savingAcs ? 'Salvando...' : 'Cadastrar ACS'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default GestaoEquipesMicroareas;
