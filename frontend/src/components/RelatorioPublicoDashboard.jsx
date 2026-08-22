import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNotifications } from './ui/Notifications';
import {
  XMarkIcon,
  BuildingOffice2Icon,
  UsersIcon,
  HomeModernIcon,
  MapPinIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  HeartIcon,
  UserGroupIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

// ─── Helpers ───────────────────────────────────────────────────────────────

const fmt = (value, type) => {
  if (value === null || value === undefined || value === '') return '-';
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  if (type === 'PERCENTUAL') return `${n % 1 === 0 ? n : n.toFixed(1)}%`;
  if (type === 'POR_1000') return `${n % 1 === 0 ? n : n.toFixed(1)} / 1000 hab.`;
  return n.toLocaleString('pt-BR');
};

const progressPct = (value, meta) => {
  if (!meta || meta === 0) return null;
  return Math.min(100, Math.max(0, (Number(value) / Number(meta)) * 100));
};

const statusColor = (pct) => {
  if (pct === null) return { bar: 'bg-slate-400', text: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-50 dark:bg-slate-800/50', border: 'border-slate-200 dark:border-slate-700' };
  if (pct >= 100) return { bar: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800' };
  if (pct >= 75) return { bar: 'bg-amber-400', text: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' };
  return { bar: 'bg-red-400', text: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800' };
};

const DAY_LABELS = { seg: 'SEG', ter: 'TER', qua: 'QUA', qui: 'QUI', sex: 'SEX' };
const DAYS = ['seg', 'ter', 'qua', 'qui', 'sex'];

const parseActivities = (str) =>
  String(str || '').split('\n').map((s) => s.trim()).filter(Boolean);

// ─── Sub-componentes ────────────────────────────────────────────────────────

const Section = ({ icon: Icon, title, children }) => (
  <div className="mb-8">
    <div className="flex items-center gap-2 mb-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
        <Icon className="h-4 w-4 text-cyan-700 dark:text-cyan-400" />
      </div>
      <h3 className="text-base font-bold text-slate-800 dark:text-white">{title}</h3>
    </div>
    {children}
  </div>
);

const StatCard = ({ label, value, icon: Icon, color = 'cyan' }) => {
  const colors = {
    cyan: 'from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-900/40 border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300',
    green: 'from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-900/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
    blue: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
    violet: 'from-violet-50 to-violet-100 dark:from-violet-900/20 dark:to-violet-900/40 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300',
  };
  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-5 flex flex-col gap-2 ${colors[color]}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</span>
        <Icon className="h-5 w-5 opacity-60" />
      </div>
      <span className="text-3xl font-bold">{value !== null && value !== undefined && value !== '' ? Number(value).toLocaleString('pt-BR') : '—'}</span>
    </div>
  );
};

const IndicatorBar = ({ indicator }) => {
  const pct = progressPct(indicator.valor, indicator.meta);
  const colors = statusColor(pct);
  const hasMeta = indicator.meta !== null && indicator.meta !== undefined;

  return (
    <div className={`rounded-xl border p-4 ${colors.bg} ${colors.border}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-sm font-semibold text-slate-800 dark:text-white leading-tight flex-1">{indicator.nome_indicador}</p>
        <span className={`shrink-0 text-base font-bold ${colors.text}`}>{fmt(indicator.valor, indicator.tipo_valor)}</span>
      </div>

      {pct !== null ? (
        <div className="space-y-1">
          <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${colors.bar}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>0</span>
            <span className="flex items-center gap-1">
              {pct >= 100 ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Meta atingida!</span>
              ) : (
                <span>Meta: {fmt(indicator.meta, indicator.tipo_valor)}</span>
              )}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400 dark:text-slate-500 italic">Sem meta definida</p>
      )}

      {indicator.periodo_referencia && (
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">Período: {indicator.periodo_referencia}</p>
      )}
    </div>
  );
};

const IndicatorSummaryBar = ({ indicators }) => {
  if (!indicators || indicators.length === 0) return null;
  const withGoal = indicators.filter((i) => i.meta !== null && i.meta !== undefined && i.meta !== 0);
  const achieved = withGoal.filter((i) => progressPct(i.valor, i.meta) >= 100).length;
  const onTrack = withGoal.filter((i) => { const p = progressPct(i.valor, i.meta); return p >= 75 && p < 100; }).length;
  const atRisk = withGoal.filter((i) => progressPct(i.valor, i.meta) < 75).length;

  if (withGoal.length === 0) return null;

  return (
    <div className="mb-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wide">Resumo dos indicadores</p>
      <div className="flex gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-emerald-500" />
          <span className="text-sm text-slate-700 dark:text-slate-300"><strong>{achieved}</strong> meta{achieved !== 1 ? 's' : ''} atingida{achieved !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-amber-400" />
          <span className="text-sm text-slate-700 dark:text-slate-300"><strong>{onTrack}</strong> em progresso</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-400" />
          <span className="text-sm text-slate-700 dark:text-slate-300"><strong>{atRisk}</strong> abaixo da meta</span>
        </div>
      </div>
    </div>
  );
};

const TeamCard = ({ prof }) => (
  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 flex items-center gap-4">
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
      <span className="text-xl font-bold text-blue-700 dark:text-blue-300">{prof.quantidade}</span>
    </div>
    <div className="min-w-0">
      <p className="font-semibold text-slate-800 dark:text-white text-sm truncate">{prof.cargo_funcao}</p>
      {prof.tipo_vinculo && (
        <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{prof.tipo_vinculo}</p>
      )}
    </div>
  </div>
);

const ServiceBadge = ({ name }) => (
  <div className="flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2">
    <CheckCircleIcon className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
    <span className="text-sm text-slate-700 dark:text-slate-300 leading-tight">{name}</span>
  </div>
);

const ScheduleReadOnly = ({ data, prefix = 'cronograma_ubs', emptyLabel = 'Cronograma não cadastrado neste relatório.' }) => {
  const hasAnyActivity = DAYS.some(
    (d) => parseActivities(data?.[`${prefix}_${d}_manha`]).length > 0 ||
            parseActivities(data?.[`${prefix}_${d}_tarde`]).length > 0
  );

  if (!hasAnyActivity) return (
    <p className="text-sm text-slate-400 dark:text-slate-500 italic py-4 text-center">{emptyLabel}</p>
  );

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="w-20 py-2 pl-1 text-left text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wide text-[10px]">Turno</th>
            {DAYS.map((d) => (
              <th key={d} className="py-2 px-2 text-center text-slate-600 dark:text-slate-300 font-bold text-[11px] tracking-widest">{DAY_LABELS[d]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {['manha', 'tarde'].map((shift) => (
            <tr key={shift}>
              <td className="py-2 pr-2 align-middle">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap
                  ${shift === 'manha'
                    ? 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300'
                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'}`}>
                  {shift === 'manha' ? '☀️ Manhã' : '🌅 Tarde'}
                </span>
              </td>
              {DAYS.map((d) => {
                const items = parseActivities(data?.[`${prefix}_${d}_${shift}`]);
                const isEmpty = items.length === 0;
                return (
                  <td key={d} className={`py-2 px-2 align-top rounded-lg text-xs
                    ${shift === 'manha'
                      ? 'bg-sky-50/60 dark:bg-sky-900/10'
                      : 'bg-amber-50/60 dark:bg-amber-900/10'}`}>
                    {isEmpty ? (
                      <span className="text-slate-300 dark:text-slate-700 select-none">—</span>
                    ) : (
                      <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                        {items.map((item, i) => (
                          <li key={i} className="py-1.5 leading-snug text-slate-700 dark:text-slate-300 flex items-start gap-1.5">
                            <span className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${shift === 'manha' ? 'bg-sky-400' : 'bg-amber-400'}`} />
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const TextBlock = ({ label, text, highlight = false }) => {
  if (!text) return null;
  return (
    <div className={`rounded-xl p-4 border ${highlight ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'}`}>
      {label && <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${highlight ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>{label}</p>}
      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">{text}</p>
    </div>
  );
};

// ─── Componente principal ───────────────────────────────────────────────────

const RelatorioPublicoDashboard = ({ isOpen, onClose, reportId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const { notify, dismiss } = useNotifications();

  const handleExportPdf = async () => {
    if (!reportId || exporting) return;
    setExporting(true);
    const loadingToastId = notify({
      type: 'info',
      message: 'Gerando o PDF do relatório... isso pode levar alguns segundos.',
      duration: 0,
    });
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/ubs/${reportId}/export/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `relatorio_${reportId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      notify({ type: 'success', message: 'PDF gerado. O download foi iniciado.' });
    } catch (err) {
      notify({ type: 'error', message: 'Erro ao exportar o relatório em PDF. Tente novamente.' });
    } finally {
      dismiss(loadingToastId);
      setExporting(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !reportId) return;
    setData(null);
    setError('');
    setLoading(true);
    const token = localStorage.getItem('token');
    axios
      .get(`/api/ubs/${reportId}/diagnosis`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setData(res.data))
      .catch(() => setError('Não foi possível carregar o relatório. Tente novamente.'))
      .finally(() => setLoading(false));
  }, [isOpen, reportId]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const ubs = data?.ubs ?? {};
  const indicators = data?.indicators_latest ?? [];
  const professionals = data?.professional_groups ?? [];
  const services = data?.services?.services ?? [];
  const outrosServicos = data?.services?.outros_servicos;
  const territory = data?.territory_profile;
  const submission = data?.submission;

  const totalProfissionais = professionals.reduce((sum, p) => sum + (p.quantidade || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6">
      <div className="relative flex flex-col w-full max-w-5xl max-h-[95vh] rounded-2xl bg-gray-50 dark:bg-slate-950 shadow-2xl overflow-hidden">

        {/* ── Header ── */}
        <div className="flex-shrink-0 bg-gradient-to-r from-cyan-700 to-blue-700 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20">
                <BuildingOffice2Icon className="h-7 w-7 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold leading-tight truncate">
                  {ubs.nome_relatorio || ubs.nome_ubs || 'Relatório Situacional'}
                </h2>
                {ubs.nome_ubs && ubs.nome_relatorio && (
                  <p className="text-sm text-cyan-100 truncate">{ubs.nome_ubs}</p>
                )}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                  {ubs.area_atuacao && (
                    <span className="flex items-center gap-1 text-xs text-cyan-100">
                      <MapPinIcon className="h-3.5 w-3.5" /> {ubs.area_atuacao}
                    </span>
                  )}
                  {ubs.periodo_referencia && (
                    <span className="flex items-center gap-1 text-xs text-cyan-100">
                      <CalendarDaysIcon className="h-3.5 w-3.5" /> {ubs.periodo_referencia}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleExportPdf}
                disabled={exporting || loading || !data}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/15 hover:bg-white/25 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white text-sm font-medium"
                title="Exportar PDF"
              >
                {exporting ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                ) : (
                  <ArrowDownTrayIcon className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">{exporting ? 'Gerando…' : 'Exportar PDF'}</span>
              </button>
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Fechar"
              >
                <XMarkIcon className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>

          {/* Meta-info strip */}
          <div className="mt-4 flex flex-wrap gap-3">
            {ubs.responsavel_nome && (
              <div className="rounded-lg bg-white/10 px-3 py-1.5">
                <p className="text-[10px] text-cyan-200 uppercase tracking-wide">Responsável</p>
                <p className="text-sm font-semibold">{ubs.responsavel_nome}</p>
                {ubs.responsavel_cargo && <p className="text-xs text-cyan-200">{ubs.responsavel_cargo}</p>}
              </div>
            )}
            {ubs.cnes && (
              <div className="rounded-lg bg-white/10 px-3 py-1.5">
                <p className="text-[10px] text-cyan-200 uppercase tracking-wide">CNES</p>
                <p className="text-sm font-semibold">{ubs.cnes}</p>
              </div>
            )}
            {submission?.status === 'SUBMITTED' && (
              <div className="rounded-lg bg-emerald-500/30 border border-emerald-400/30 px-3 py-1.5 flex items-center gap-1.5">
                <CheckCircleIcon className="h-4 w-4 text-emerald-300" />
                <p className="text-sm font-semibold text-emerald-100">Relatório oficial</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Corpo ── */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7">

          {loading && (
            <div className="space-y-4 animate-pulse">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-700" />)}
              </div>
              <div className="h-40 rounded-2xl bg-slate-200 dark:bg-slate-700" />
              <div className="h-40 rounded-2xl bg-slate-200 dark:bg-slate-700" />
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <ExclamationTriangleIcon className="h-12 w-12 text-red-400" />
              <p className="text-slate-600 dark:text-slate-300">{error}</p>
              <button onClick={onClose} className="text-sm text-cyan-600 hover:underline">Fechar</button>
            </div>
          )}

          {!loading && !error && data && (
            <>
              {/* ── Estatísticas populacionais ── */}
              {(ubs.numero_habitantes_ativos || ubs.numero_familias_cadastradas || ubs.numero_microareas || ubs.numero_domicilios) && (
                <Section icon={UsersIcon} title="Nossa comunidade">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard label="Habitantes" value={ubs.numero_habitantes_ativos} icon={UsersIcon} color="cyan" />
                    <StatCard label="Famílias cadastradas" value={ubs.numero_familias_cadastradas} icon={HomeModernIcon} color="green" />
                    <StatCard label="Microáreas" value={ubs.numero_microareas} icon={MapPinIcon} color="blue" />
                    <StatCard label="Domicílios" value={ubs.numero_domicilios} icon={BuildingOffice2Icon} color="violet" />
                  </div>
                </Section>
              )}

              {/* ── Indicadores de saúde ── */}
              {indicators.length > 0 && (
                <Section icon={HeartIcon} title="Indicadores de saúde">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    Acompanhe como a sua UBS está desempenhando nas principais metas de saúde da comunidade.
                  </p>
                  <IndicatorSummaryBar indicators={indicators} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {indicators.map((ind) => (
                      <IndicatorBar key={ind.id} indicator={ind} />
                    ))}
                  </div>

                  {/* Legenda */}
                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" /> Meta atingida</span>
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-400 inline-block" /> Em progresso (≥ 75%)</span>
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-400 inline-block" /> Precisa de atenção</span>
                  </div>
                </Section>
              )}

              {/* ── Equipe de saúde ── */}
              {professionals.length > 0 && (
                <Section icon={UserGroupIcon} title={`Equipe de saúde (${totalProfissionais} profissionais)`}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {professionals.map((p) => (
                      <TeamCard key={p.id} prof={p} />
                    ))}
                  </div>
                </Section>
              )}

              {/* ── Serviços oferecidos ── */}
              {(services.length > 0 || outrosServicos) && (
                <Section icon={SparklesIcon} title="Serviços oferecidos pela UBS">
                  {services.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {services.map((s) => (
                        <ServiceBadge key={s.id} name={s.name} />
                      ))}
                    </div>
                  )}
                  {outrosServicos && (
                    <TextBlock label="Outros serviços" text={outrosServicos} />
                  )}
                </Section>
              )}

              {/* ── Cronogramas ── */}
              <Section icon={ClockIcon} title="Cronogramas de funcionamento">
                {/* Cronograma da UBS */}
                <div className="rounded-2xl border border-sky-200 dark:border-sky-800 bg-white dark:bg-slate-900 overflow-hidden mb-4">
                  <div className="flex items-center gap-2 px-4 py-3 bg-sky-50 dark:bg-sky-900/30 border-b border-sky-200 dark:border-sky-800">
                    <span className="text-lg">🏥</span>
                    <span className="text-sm font-semibold text-sky-800 dark:text-sky-300">Cronograma da UBS</span>
                  </div>
                  <div className="p-4">
                    <ScheduleReadOnly data={ubs} prefix="cronograma_ubs" emptyLabel="Cronograma da UBS não cadastrado." />
                    {ubs.cronograma_ubs_observacoes && (
                      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
                        📌 {ubs.cronograma_ubs_observacoes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Cronograma dos Residentes */}
                <div className="rounded-2xl border border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-900 overflow-hidden mb-4">
                  <div className="flex items-center gap-2 px-4 py-3 bg-violet-50 dark:bg-violet-900/30 border-b border-violet-200 dark:border-violet-800">
                    <span className="text-lg">🎓</span>
                    <span className="text-sm font-semibold text-violet-800 dark:text-violet-300">Cronograma dos Residentes</span>
                  </div>
                  <div className="p-4">
                    <ScheduleReadOnly data={ubs} prefix="cronograma_residentes" emptyLabel="Cronograma dos residentes não cadastrado." />
                    {ubs.cronograma_residentes_observacoes && (
                      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
                        📌 {ubs.cronograma_residentes_observacoes}
                      </p>
                    )}
                  </div>
                </div>

                {ubs.fluxo_agenda_acesso && (
                  <TextBlock label="Como funciona o acesso" text={ubs.fluxo_agenda_acesso} />
                )}
              </Section>

              {/* ── Território ── */}
              {territory && (
                <Section icon={MapPinIcon} title="Nosso território">
                  <div className="space-y-3">
                    <TextBlock text={territory.descricao_territorio} />
                    {territory.potencialidades_territorio && (
                      <TextBlock label="Pontos fortes da comunidade" text={territory.potencialidades_territorio} />
                    )}
                    {territory.riscos_vulnerabilidades && (
                      <TextBlock label="Áreas que precisam de atenção" text={territory.riscos_vulnerabilidades} highlight />
                    )}
                  </div>
                </Section>
              )}

              {/* ── Descritivos ── */}
              {(ubs.descritivos_gerais || ubs.observacoes_gerais) && (
                <Section icon={InformationCircleIcon} title="Informações adicionais">
                  <div className="space-y-3">
                    {ubs.descritivos_gerais && <TextBlock text={ubs.descritivos_gerais} />}
                    {ubs.observacoes_gerais && <TextBlock label="Observações" text={ubs.observacoes_gerais} />}
                  </div>
                </Section>
              )}

              {/* ── Empty state ── */}
              {!ubs.numero_habitantes_ativos && indicators.length === 0 && professionals.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <DocumentTextIcon className="h-14 w-14 text-slate-300 dark:text-slate-600" />
                  <p className="font-semibold text-slate-600 dark:text-slate-300">Relatório em preenchimento</p>
                  <p className="text-sm text-slate-400 dark:text-slate-500 max-w-xs">
                    Este relatório ainda está sendo preparado pela equipe da UBS. Verifique novamente em breve.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4 flex items-center justify-between gap-4">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Dados fornecidos pela equipe da UBS · MeuTerritório
          </p>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default RelatorioPublicoDashboard;
