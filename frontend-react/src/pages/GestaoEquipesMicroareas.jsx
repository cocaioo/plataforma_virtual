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
} from '@heroicons/react/24/outline';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ─── Fix para icones do Leaflet com bundlers (Vite/Webpack) ─────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─── Dados mockados (fallback caso a API nao responda) ─────────────
const MOCK_KPIS = {
  populacao_adscrita: 12450,
  familias_cadastradas: 3280,
  microareas_descobertas: 2,
  cobertura_esf: 85,
};

const MOCK_AGENTES = [
  { id: 1, nome: 'Maria Jose da Silva', microarea_nome: 'Microarea 01 - Baixa do Aragao', familias: 210, pacientes: 680 },
  { id: 2, nome: 'Francisco Alves de Sousa', microarea_nome: 'Microarea 02 - Centro', familias: 185, pacientes: 590 },
  { id: 3, nome: 'Ana Claudia Ferreira', microarea_nome: 'Microarea 03 - Piaui', familias: 230, pacientes: 720 },
  { id: 4, nome: 'Jose Ribamar Costa', microarea_nome: 'Microarea 04 - Frei Higino', familias: 195, pacientes: 615 },
  { id: 5, nome: 'Francisca das Chagas Lima', microarea_nome: 'Microarea 05 - Pindorama', familias: 220, pacientes: 695 },
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
        <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
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
      notify({ type: 'warning', message: error.message || 'Nao foi possivel carregar a UBS.' });
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
      notify({ type: 'warning', message: 'Usando dados de demonstracao. Conexao com o servidor indisponivel.' });
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

  const totalFamilias = agentes.reduce((acc, a) => acc + (a.familias || 0), 0);
  const totalPacientes = agentes.reduce((acc, a) => acc + (a.pacientes || 0), 0);

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
    setAgenteModalOpen(true);
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
        throw new Error('GeoJSON invalido.');
      }
    }

    return payload;
  };

  const handleSaveMicroarea = async () => {
    if (!canEdit || usingMockData) {
      notify({ type: 'warning', message: 'Edicao indisponivel para este usuario ou em modo de demonstracao.' });
      return;
    }

    if (!isValidId(selectedUbsId)) {
      notify({ type: 'error', message: 'Selecione uma UBS valida.' });
      return;
    }

    if (!microareaForm.nome.trim()) {
      notify({ type: 'error', message: 'O nome da microarea e obrigatorio.' });
      return;
    }

    try {
      setSavingMicroarea(true);
      const payload = buildMicroareaPayload();

      if (microareaModalMode === 'create') {
        await gestaoEquipesService.createMicroarea(payload);
        notify({ type: 'success', message: 'Microarea criada com sucesso.' });
      } else if (microareaEditingId) {
        await gestaoEquipesService.updateMicroarea(microareaEditingId, payload);
        notify({ type: 'success', message: 'Microarea atualizada com sucesso.' });
      }

      setMicroareaModalOpen(false);
      await loadData();
    } catch (error) {
      notify({ type: 'error', message: error.message || 'Erro ao salvar microarea.' });
    } finally {
      setSavingMicroarea(false);
    }
  };

  const handleSaveAgente = async () => {
    if (!canEdit || usingMockData) {
      notify({ type: 'warning', message: 'Edicao indisponivel para este usuario ou em modo de demonstracao.' });
      return;
    }

    if (!isValidId(agenteForm.usuario_id)) {
      notify({ type: 'error', message: 'Selecione um ACS valido.' });
      return;
    }

    if (!isValidId(agenteForm.microarea_id)) {
      notify({ type: 'error', message: 'Selecione uma microarea valida.' });
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
          Gestao de Equipes e Microareas
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
          Edite microareas e agentes. Os indicadores sao calculados automaticamente.
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
            Nenhuma UBS configurada. Finalize a configuracao inicial para continuar.
          </p>
        </div>
      )}

      {!loading && selectedUbsId && (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 rise-fade stagger-1">
            <KpiCard
              icon={UsersIcon}
              value={(kpis.populacao_adscrita || 0).toLocaleString('pt-BR')}
              label="Populacao Adscrita"
              color="bg-blue-600"
            />
            <KpiCard
              icon={HomeModernIcon}
              value={(kpis.familias_cadastradas || 0).toLocaleString('pt-BR')}
              label="Familias Cadastradas"
              color="bg-emerald-600"
            />
            <KpiCard
              icon={MapIcon}
              value={kpis.microareas_descobertas || 0}
              label="Microareas Descobertas"
              color="bg-amber-500"
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
                        Agentes Comunitarios de Saude
                      </h2>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                        {agentes.length} agentes &middot; {totalFamilias} familias &middot; {totalPacientes.toLocaleString('pt-BR')} pacientes
                      </p>
                    </div>
                  </div>
                  {canEdit && !usingMockData && (
                    <button
                      onClick={openNewAgente}
                      className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-700"
                    >
                      Novo agente
                    </button>
                  )}
                </div>
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                  <thead className="bg-gray-50 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Agente de Saude
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Microarea
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Familias
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Pacientes
                      </th>
                      {canEdit && !usingMockData && (
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                          Acoes
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
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                            {agente.familias}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                            {agente.pacientes}
                          </span>
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
                    <div className="flex gap-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                        {agente.familias} familias
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                        {agente.pacientes} pacientes
                      </span>
                    </div>
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
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Microareas</h2>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                      {microareas.length} microareas cadastradas
                    </p>
                  </div>
                  {canEdit && !usingMockData && (
                    <button
                      onClick={openNewMicroarea}
                      className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-700"
                    >
                      Nova microarea
                    </button>
                  )}
                </div>
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                  <thead className="bg-gray-50 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Microarea
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Familias
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Populacao
                      </th>
                      {canEdit && !usingMockData && (
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                          Acoes
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
                    <div className="flex gap-3 text-xs text-gray-500 dark:text-slate-400">
                      <span>{microarea.familias} familias</span>
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
                      Mapa do Territorio
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                      Parnaiba - PI &middot; Area de atuacao da ESF
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
                      Parnaiba - PI
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
        title={microareaModalMode === 'create' ? 'Nova microarea' : 'Editar microarea'}
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
              placeholder="Microarea 01 - Centro"
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
          <Field label="Populacao">
            <input
              type="number"
              value={microareaForm.populacao}
              onChange={(event) => setMicroareaForm((prev) => ({ ...prev, populacao: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              placeholder="Ex.: 2100"
            />
          </Field>
          <Field label="Familias">
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
        title={agenteModalMode === 'create' ? 'Novo agente' : 'Editar agente'}
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
          <Field label="ACS responsavel">
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
          <Field label="Microarea">
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
              <option value="false">Nao</option>
            </select>
          </Field>
        </div>
      </Modal>
    </div>
  );
};

export default GestaoEquipesMicroareas;
