import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import { useNotifications } from '../components/ui/Notifications';

const toInputDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 16);
};

const toInputDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const MOCK_UBS_ADALTO = {
  id: 3,
  nome_ubs: 'ESF 41 - Adalto Parentes Sampaio',
  cnes: '0000000',
  area_atuacao: 'Baixa do Aragao, Parnaiba - PI',
  status: 'DRAFT',
};

const Cronograma = () => {
  const { notify, confirm } = useNotifications();
  const [ubsOptions, setUbsOptions] = useState([]);
  const [selectedUbs, setSelectedUbs] = useState('');
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filters, setFilters] = useState({
    start: '',
    end: '',
  });

  const [form, setForm] = useState({
    titulo: '',
    tipo: 'SALA_VACINA',
    local: '',
    inicio: '',
    fim: '',
    dia_inteiro: false,
    observacoes: '',
    recorrencia: 'NONE',
    recorrencia_intervalo: 1,
    recorrencia_fim: '',
  });

  const loadUbs = useCallback(async () => {
    try {
      const data = await api.request('/ubs?page=1&page_size=100', { requiresAuth: true });
      const items = data?.items || [];
      const hasAdalto = items.some((u) => u.id === MOCK_UBS_ADALTO.id);
      const merged = hasAdalto ? items : [MOCK_UBS_ADALTO, ...items];
      setUbsOptions(merged);
      if (!selectedUbs && merged.length > 0) {
        setSelectedUbs(String(merged[0].id));
      }
    } catch (error) {
      setUbsOptions([MOCK_UBS_ADALTO]);
      if (!selectedUbs) setSelectedUbs(String(MOCK_UBS_ADALTO.id));
      notify({ type: 'error', message: 'Erro ao carregar UBS.' });
    }
  }, [notify, selectedUbs]);

  const loadEvents = useCallback(async () => {
    if (!selectedUbs) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ ubs_id: selectedUbs });
      if (filters.start) params.append('start', new Date(filters.start).toISOString());
      if (filters.end) params.append('end', new Date(filters.end).toISOString());
      const data = await api.request(`/cronograma?${params.toString()}`, { requiresAuth: true });
      setEvents(Array.isArray(data) ? data : []);
    } catch (error) {
      setEvents([]);
      notify({ type: 'error', message: 'Erro ao carregar cronograma.' });
    } finally {
      setIsLoading(false);
    }
  }, [filters.end, filters.start, notify, selectedUbs]);

  useEffect(() => {
    loadUbs();
  }, [loadUbs]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const resetForm = () => {
    setForm({
      titulo: '',
      tipo: 'SALA_VACINA',
      local: '',
      inicio: '',
      fim: '',
      dia_inteiro: false,
      observacoes: '',
      recorrencia: 'NONE',
      recorrencia_intervalo: 1,
      recorrencia_fim: '',
    });
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedUbs) {
      notify({ type: 'warning', message: 'Selecione uma UBS.' });
      return;
    }

    if (!form.inicio) {
      notify({ type: 'warning', message: 'Informe a data de início.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const inicioValue = form.dia_inteiro
        ? new Date(`${form.inicio}T00:00:00`).toISOString()
        : new Date(form.inicio).toISOString();
      const fimValue = form.fim
        ? form.dia_inteiro
          ? new Date(`${form.fim}T23:59:59`).toISOString()
          : new Date(form.fim).toISOString()
        : null;

      const payload = {
        ubs_id: Number(selectedUbs),
        titulo: form.titulo,
        tipo: form.tipo,
        local: form.local || null,
        inicio: inicioValue,
        fim: fimValue,
        dia_inteiro: form.dia_inteiro,
        observacoes: form.observacoes || null,
        recorrencia: form.recorrencia,
        recorrencia_intervalo: Number(form.recorrencia_intervalo || 1),
        recorrencia_fim: form.recorrencia_fim || null,
      };

      if (editingId) {
        await api.request(`/cronograma/${editingId}`, {
          method: 'PATCH',
          requiresAuth: true,
          body: payload,
        });
        notify({ type: 'success', message: 'Evento atualizado.' });
      } else {
        await api.request('/cronograma', {
          method: 'POST',
          requiresAuth: true,
          body: payload,
        });
        notify({ type: 'success', message: 'Evento criado.' });
      }

      resetForm();
      await loadEvents();
    } catch (error) {
      notify({ type: 'error', message: 'Erro ao salvar evento.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (evento) => {
    setEditingId(evento.id);
    setForm({
      titulo: evento.titulo,
      tipo: evento.tipo,
      local: evento.local || '',
      inicio: evento.dia_inteiro ? toInputDate(evento.inicio) : toInputDateTime(evento.inicio),
      fim: evento.dia_inteiro ? toInputDate(evento.fim) : toInputDateTime(evento.fim),
      dia_inteiro: evento.dia_inteiro,
      observacoes: evento.observacoes || '',
      recorrencia: evento.recorrencia,
      recorrencia_intervalo: evento.recorrencia_intervalo || 1,
      recorrencia_fim: evento.recorrencia_fim || '',
    });
  };

  const handleDelete = async (eventId) => {
    const confirmed = await confirm({
      title: 'Remover evento',
      message: 'Deseja remover este evento do cronograma?',
      confirmLabel: 'Remover',
      cancelLabel: 'Cancelar',
    });
    if (!confirmed) return;

    try {
      await api.request(`/cronograma/${eventId}`, { method: 'DELETE', requiresAuth: true });
      await loadEvents();
      notify({ type: 'success', message: 'Evento removido.' });
    } catch (error) {
      notify({ type: 'error', message: 'Erro ao remover evento.' });
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="bg-white dark:bg-slate-900 shadow-md rounded-lg p-6 mb-8">
        <h1 className="text-2xl font-semibold text-gray-800">Cronograma e Calendário</h1>
        <p className="text-gray-600 mt-2">
          Organize sala de vacina, farmácia básica e reuniões da equipe por UBS.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 shadow-md rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          {editingId ? 'Editar evento' : 'Novo evento'}
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">UBS</label>
            <select
              value={selectedUbs}
              onChange={(e) => setSelectedUbs(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-gray-900 dark:text-slate-100"
            >
              {ubsOptions.map((ubs) => (
                <option key={ubs.id} value={ubs.id}>
                  {ubs.nome_ubs}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Tipo</label>
            <select
              value={form.tipo}
              onChange={(e) => setForm((prev) => ({ ...prev, tipo: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-gray-900 dark:text-slate-100"
            >
              <option value="SALA_VACINA">Sala de vacina</option>
              <option value="FARMACIA_BASICA">Farmácia básica</option>
              <option value="REUNIAO_EQUIPE">Reunião da equipe</option>
              <option value="OUTRO">Outro</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Título</label>
            <input
              value={form.titulo}
              onChange={(e) => setForm((prev) => ({ ...prev, titulo: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-gray-900 dark:text-slate-100"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Início</label>
            <input
              type={form.dia_inteiro ? 'date' : 'datetime-local'}
              value={form.inicio}
              onChange={(e) => setForm((prev) => ({ ...prev, inicio: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-gray-900 dark:text-slate-100"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Fim</label>
            <input
              type={form.dia_inteiro ? 'date' : 'datetime-local'}
              value={form.fim}
              onChange={(e) => setForm((prev) => ({ ...prev, fim: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-gray-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Local</label>
            <input
              value={form.local}
              onChange={(e) => setForm((prev) => ({ ...prev, local: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-gray-900 dark:text-slate-100"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={form.dia_inteiro}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  dia_inteiro: e.target.checked,
                  inicio: e.target.checked ? prev.inicio.slice(0, 10) : prev.inicio,
                  fim: e.target.checked ? prev.fim.slice(0, 10) : prev.fim,
                }))
              }
            />
            Evento de dia inteiro
          </label>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Recorrencia</label>
            <select
              value={form.recorrencia}
              onChange={(e) => setForm((prev) => ({ ...prev, recorrencia: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-gray-900 dark:text-slate-100"
            >
              <option value="NONE">Sem recorrencia</option>
              <option value="DAILY">Diaria</option>
              <option value="WEEKLY">Semanal</option>
              <option value="MONTHLY">Mensal</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Intervalo (recorrencia)</label>
            <input
              type="number"
              min={1}
              value={form.recorrencia_intervalo}
              onChange={(e) => setForm((prev) => ({ ...prev, recorrencia_intervalo: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-gray-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Fim da recorrencia</label>
            <input
              type="date"
              value={form.recorrencia_fim}
              onChange={(e) => setForm((prev) => ({ ...prev, recorrencia_fim: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-gray-900 dark:text-slate-100"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Observacoes</label>
            <textarea
              value={form.observacoes}
              onChange={(e) => setForm((prev) => ({ ...prev, observacoes: e.target.value }))}
              rows={3}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-gray-900 dark:text-slate-100"
            />
          </div>
          <div className="md:col-span-2 flex justify-end gap-3">
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-md border border-gray-300 dark:border-slate-700 dark:text-slate-200"
              >
                Cancelar edicao
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-md"
            >
              {isSubmitting ? 'Salvando...' : editingId ? 'Atualizar evento' : 'Salvar evento'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Filtro</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Inicio</label>
            <input
              type="datetime-local"
              value={filters.start}
              onChange={(e) => setFilters((prev) => ({ ...prev, start: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-gray-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Fim</label>
            <input
              type="datetime-local"
              value={filters.end}
              onChange={(e) => setFilters((prev) => ({ ...prev, end: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-gray-900 dark:text-slate-100"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading && <p className="text-gray-500 dark:text-slate-400">Carregando eventos...</p>}
        {!isLoading && events.length === 0 && (
          <p className="text-gray-500 dark:text-slate-400">Nenhum evento encontrado.</p>
        )}
        {events.map((evento) => (
          <div key={evento.id} className="bg-white dark:bg-slate-900 shadow-md rounded-lg p-4">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{evento.titulo}</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">{evento.tipo}</p>
                <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
                  {new Date(evento.inicio).toLocaleString()} {evento.fim ? ` - ${new Date(evento.fim).toLocaleString()}` : ''}
                </p>
                {evento.local && <p className="text-sm text-gray-600 dark:text-slate-300">Local: {evento.local}</p>}
                {evento.recorrencia !== 'NONE' && (
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Recorrencia: {evento.recorrencia} (intervalo {evento.recorrencia_intervalo})
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleEdit(evento)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(evento.id)}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Remover
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Cronograma;
