import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNotifications } from '../components/ui/Notifications';
import { isValidCpf, isValidEmail, validateName, validatePassword } from '../utils/validators';
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
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import bairrosParnaiba, { COLORS } from '../data/bairrosParnaiba';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

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

// ─── Componente para reposicionar o mapa ────────────────────────────
const FlyToBairro = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 15, { duration: 0.8 });
  }, [center, map]);
  return null;
};

// ─── Componente Principal ───────────────────────────────────────────
const GestaoEquipesMicroareas = () => {
  const { notify, confirm } = useNotifications();
  const currentUser = api.getCurrentUser();
  const canEdit = useMemo(() => {
    const role = (currentUser?.role || 'USER').toUpperCase();
    return role === 'GESTOR' || currentUser?.cargo === 'Recepcionista';
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

  // ─── Estado do mapa interativo de bairros ──────────────────────────
  const [bairroSearch, setBairroSearch] = useState('');
  const [flyToCenter, setFlyToCenter] = useState(null);
  const [selectedBairro, setSelectedBairro] = useState(null);
  const [bairroModalOpen, setBairroModalOpen] = useState(false);
  const [bairroMicroareaForm, setBairroMicroareaForm] = useState({ nome: '', status: 'DESCOBERTA', populacao: '', familias: '' });
  const [savingBairroMicroarea, setSavingBairroMicroarea] = useState(false);

  // Mapa: bairro_id → microarea (para colorir polígonos atribuídos)
  const bairroToMicroarea = useMemo(() => {
    const m = new Map();
    microareas.forEach((ma) => {
      if (ma.bairro) m.set(ma.bairro, ma);
    });
    return m;
  }, [microareas]);

  // Bairros filtrados pela busca
  const filteredBairros = useMemo(() => {
    if (!bairroSearch.trim()) return [];
    const q = bairroSearch.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return bairrosParnaiba.features.filter((f) => {
      const name = f.properties.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return name.includes(q);
    });
  }, [bairroSearch]);

  const handleBairroClick = (feature) => {
    setSelectedBairro(feature);
    const existing = bairroToMicroarea.get(feature.properties.id);
    if (existing) {
      setBairroMicroareaForm({
        nome: existing.nome,
        status: existing.status,
        populacao: String(existing.populacao),
        familias: String(existing.familias),
      });
    } else {
      setBairroMicroareaForm({
        nome: `Microárea - ${feature.properties.nome}`,
        status: 'DESCOBERTA',
        populacao: '',
        familias: '',
      });
    }
    setBairroModalOpen(true);
  };

  const handleSearchSelect = (feature) => {
    const center = feature.properties.center;
    setFlyToCenter(center);
    setBairroSearch('');
    handleBairroClick(feature);
  };

  const handleSaveBairroMicroarea = async () => {
    if (!selectedBairro || !selectedUbsId) return;
    setSavingBairroMicroarea(true);
    try {
      const existing = bairroToMicroarea.get(selectedBairro.properties.id);
      const payload = {
        nome: bairroMicroareaForm.nome,
        status: bairroMicroareaForm.status,
        populacao: Number(bairroMicroareaForm.populacao) || 0,
        familias: Number(bairroMicroareaForm.familias) || 0,
        bairro: selectedBairro.properties.id,
        geojson: selectedBairro.geometry,
      };
      if (existing) {
        await gestaoEquipesService.updateMicroarea(existing.id, payload);
        notify({ type: 'success', message: `Microárea "${payload.nome}" atualizada.` });
      } else {
        await gestaoEquipesService.createMicroarea({ ...payload, ubs_id: Number(selectedUbsId) });
        notify({ type: 'success', message: `Bairro "${selectedBairro.properties.nome}" definido como microárea.` });
      }
      setBairroModalOpen(false);
      setSelectedBairro(null);
      loadData();
    } catch (err) {
      notify({ type: 'error', message: err.message || 'Erro ao salvar microárea.' });
    } finally {
      setSavingBairroMicroarea(false);
    }
  };

  const handleRemoveBairroMicroarea = async () => {
    if (!selectedBairro) return;
    const existing = bairroToMicroarea.get(selectedBairro.properties.id);
    if (!existing) return;
    const confirmed = await confirm(`Remover microárea "${existing.nome}" do bairro ${selectedBairro.properties.nome}?`);
    if (!confirmed) return;
    try {
      await gestaoEquipesService.deleteMicroarea(existing.id);
      notify({ type: 'success', message: 'Microárea removida.' });
      setBairroModalOpen(false);
      setSelectedBairro(null);
      loadData();
    } catch (err) {
      notify({ type: 'error', message: err.message || 'Erro ao remover microárea.' });
    }
  };

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

    const nomeError = validateName(acsForm.nome);
    if (nomeError) {
      notify({ type: 'warning', message: nomeError });
      return;
    }

    if (!isValidEmail(acsForm.email)) {
      notify({ type: 'warning', message: 'Informe um email valido.' });
      return;
    }

    if (!isValidCpf(acsForm.cpf)) {
      notify({ type: 'warning', message: 'Informe um CPF valido.' });
      return;
    }

    const senhaError = validatePassword(acsForm.senha);
    if (senhaError) {
      notify({ type: 'warning', message: senhaError });
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

  const handleDeleteAgente = async (agente) => {
    if (!canEdit || usingMockData) {
      notify({ type: 'warning', message: 'Edição indisponível para este usuário ou em modo de demonstração.' });
      return;
    }

    const confirmed = await confirm({
      title: 'Desassociar agente',
      message: `Deseja desassociar ${agente.nome || 'este agente'} da microárea?`,
      confirmLabel: 'Desassociar',
      cancelLabel: 'Cancelar',
    });
    if (!confirmed) return;

    try {
      await gestaoEquipesService.deleteAgente(agente.id);
      notify({ type: 'success', message: 'Agente desassociado com sucesso.' });
      await loadData();
    } catch (error) {
      notify({ type: 'error', message: error.message || 'Erro ao desassociar agente.' });
    }
  };

  const handleDeleteMicroarea = async (microarea) => {
    if (!canEdit || usingMockData) {
      notify({ type: 'warning', message: 'Edição indisponível para este usuário ou em modo de demonstração.' });
      return;
    }

    const confirmed = await confirm({
      title: 'Descadastrar microárea',
      message: `Deseja descadastrar a microárea ${microarea.nome}? Os vínculos com agentes serão removidos.`,
      confirmLabel: 'Descadastrar',
      cancelLabel: 'Cancelar',
    });
    if (!confirmed) return;

    try {
      await gestaoEquipesService.deleteMicroarea(microarea.id);
      notify({ type: 'success', message: 'Microárea descadastrada com sucesso.' });
      await loadData();
    } catch (error) {
      notify({ type: 'error', message: error.message || 'Erro ao descadastrar microárea.' });
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
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Famílias
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
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-600 dark:text-slate-300">
                          {agente.familias ?? 0}
                        </td>
                        {canEdit && !usingMockData && (
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => openEditAgente(agente)}
                                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleDeleteAgente(agente)}
                                className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                              >
                                Desassociar
                              </button>
                            </div>
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
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {agente.familias ?? 0} famílias
                    </p>
                    {canEdit && !usingMockData && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditAgente(agente)}
                          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteAgente(agente)}
                          className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          Desassociar
                        </button>
                      </div>
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
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => openEditMicroarea(microarea)}
                                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleDeleteMicroarea(microarea)}
                                className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                              >
                                Descadastrar
                              </button>
                            </div>
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
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditMicroarea(microarea)}
                          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteMicroarea(microarea)}
                          className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          Descadastrar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rise-fade stagger-3">
            <div className="bg-white dark:bg-slate-900 shadow-md rounded-lg overflow-hidden">
              <div className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <MapIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    <div>
                      <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                        Mapa do Território
                      </h2>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                        Parnaíba - PI &middot; Clique em um bairro para definir como microárea
                      </p>
                    </div>
                  </div>

                  {canEdit && !usingMockData && (
                    <div className="relative w-full sm:w-72">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={bairroSearch}
                        onChange={(e) => setBairroSearch(e.target.value)}
                        placeholder="Pesquisar bairro..."
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 pl-9 pr-3 py-2 text-sm text-slate-800 dark:text-white focus:border-blue-500 focus:outline-none"
                      />
                      {filteredBairros.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg">
                          {filteredBairros.map((f) => {
                            const assigned = bairroToMicroarea.has(f.properties.id);
                            return (
                              <button
                                key={f.properties.id}
                                onClick={() => handleSearchSelect(f)}
                                className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-left"
                              >
                                <span className="text-slate-800 dark:text-white">{f.properties.nome}</span>
                                {assigned && (
                                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Microárea</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Legenda */}
              <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700 flex flex-wrap gap-3 items-center text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-300">Legenda:</span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm border-2 border-emerald-500 bg-emerald-200" />
                  <span className="text-slate-600 dark:text-slate-300">Microárea coberta</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm border-2 border-amber-500 bg-amber-200" />
                  <span className="text-slate-600 dark:text-slate-300">Microárea descoberta</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm border-2 border-slate-400 bg-slate-200" />
                  <span className="text-slate-600 dark:text-slate-300">Bairro sem microárea</span>
                </span>
              </div>

              <div className="h-[500px] lg:h-[600px]">
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
                  <FlyToBairro center={flyToCenter} />
                  <Marker position={MAP_CENTER}>
                    <Popup>
                      <strong>ESF 41 - Adalto Parentes Sampaio</strong>
                      <br />
                      Parnaíba - PI
                    </Popup>
                  </Marker>

                  {bairrosParnaiba.features.map((feature) => {
                    const bId = feature.properties.id;
                    const microarea = bairroToMicroarea.get(bId);
                    const isCoberta = microarea?.status === 'COBERTA';
                    const isDescoberta = microarea?.status === 'DESCOBERTA';

                    let fillColor = '#94a3b8';
                    let borderColor = '#64748b';
                    let fillOpacity = 0.2;

                    if (isCoberta) {
                      fillColor = '#10b981';
                      borderColor = '#059669';
                      fillOpacity = 0.4;
                    } else if (isDescoberta) {
                      fillColor = '#f59e0b';
                      borderColor = '#d97706';
                      fillOpacity = 0.4;
                    }

                    return (
                      <GeoJSON
                        key={`${bId}-${microarea?.id || 'none'}-${microarea?.status || ''}`}
                        data={feature}
                        style={{
                          fillColor,
                          color: borderColor,
                          weight: 2,
                          fillOpacity,
                        }}
                        eventHandlers={{
                          click: () => {
                            if (canEdit && !usingMockData) handleBairroClick(feature);
                          },
                          mouseover: (e) => {
                            e.target.setStyle({ weight: 3, fillOpacity: fillOpacity + 0.2 });
                          },
                          mouseout: (e) => {
                            e.target.setStyle({ weight: 2, fillOpacity });
                          },
                        }}
                      >
                        <Popup>
                          <div className="text-sm">
                            <strong>{feature.properties.nome}</strong>
                            {microarea ? (
                              <>
                                <br />
                                <span className={isCoberta ? 'text-emerald-600' : 'text-amber-600'}>
                                  {microarea.nome} ({microarea.status})
                                </span>
                                <br />
                                <span className="text-gray-500">
                                  {microarea.populacao} hab. &middot; {microarea.familias} famílias
                                </span>
                                {(microareaAgents.get(microarea.id) || []).length > 0 && (
                                  <>
                                    <br />
                                    <span className="text-blue-600">
                                      ACS: {microareaAgents.get(microarea.id).join(', ')}
                                    </span>
                                  </>
                                )}
                              </>
                            ) : (
                              <>
                                <br />
                                <span className="text-gray-400">Sem microárea definida</span>
                              </>
                            )}
                          </div>
                        </Popup>
                      </GeoJSON>
                    );
                  })}
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

      {/* Modal: definir/editar microárea a partir do bairro no mapa */}
      <Modal
        open={bairroModalOpen}
        title={
          selectedBairro
            ? bairroToMicroarea.has(selectedBairro.properties.id)
              ? `Editar microárea — ${selectedBairro.properties.nome}`
              : `Definir microárea — ${selectedBairro.properties.nome}`
            : 'Microárea'
        }
        onClose={() => { setBairroModalOpen(false); setSelectedBairro(null); }}
        footer={(
          <div className="flex items-center justify-between">
            <div>
              {selectedBairro && bairroToMicroarea.has(selectedBairro.properties.id) && (
                <button
                  onClick={handleRemoveBairroMicroarea}
                  className="rounded-full border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  Remover microárea
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setBairroModalOpen(false); setSelectedBairro(null); }}
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveBairroMicroarea}
                disabled={savingBairroMicroarea}
                className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-60"
              >
                {savingBairroMicroarea
                  ? 'Salvando...'
                  : selectedBairro && bairroToMicroarea.has(selectedBairro.properties.id)
                    ? 'Atualizar'
                    : 'Definir como microárea'}
              </button>
            </div>
          </div>
        )}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nome da microárea">
            <input
              type="text"
              value={bairroMicroareaForm.nome}
              onChange={(e) => setBairroMicroareaForm((prev) => ({ ...prev, nome: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              placeholder="Ex.: Microárea 01 - Centro"
            />
          </Field>
          <Field label="Status">
            <select
              value={bairroMicroareaForm.status}
              onChange={(e) => setBairroMicroareaForm((prev) => ({ ...prev, status: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            >
              <option value="COBERTA">COBERTA</option>
              <option value="DESCOBERTA">DESCOBERTA</option>
            </select>
          </Field>
          <Field label="População">
            <input
              type="number"
              value={bairroMicroareaForm.populacao}
              onChange={(e) => setBairroMicroareaForm((prev) => ({ ...prev, populacao: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              placeholder="Ex.: 2100"
            />
          </Field>
          <Field label="Famílias">
            <input
              type="number"
              value={bairroMicroareaForm.familias}
              onChange={(e) => setBairroMicroareaForm((prev) => ({ ...prev, familias: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              placeholder="Ex.: 210"
            />
          </Field>
        </div>
        <div className="mt-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            <strong>Bairro:</strong> {selectedBairro?.properties.nome}
            {selectedBairro && bairroToMicroarea.has(selectedBairro.properties.id) && (
              <> &middot; <span className="text-emerald-600 dark:text-emerald-400">Já possui microárea atribuída</span></>
            )}
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default GestaoEquipesMicroareas;
