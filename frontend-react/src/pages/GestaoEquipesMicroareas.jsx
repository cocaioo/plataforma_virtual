import { useState, useEffect, useCallback } from 'react';
import { useNotifications } from '../components/ui/Notifications';
import { gestaoEquipesService } from '../services/gestaoEquipesService';
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

// ─── Fix para ícones do Leaflet com bundlers (Vite/Webpack) ─────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─── Dados mockados (fallback caso a API não responda) ──────────────
const MOCK_KPIS = {
  populacao_adscrita: 12450,
  familias_cadastradas: 3280,
  microareas_descobertas: 2,
  cobertura_esf: 85,
};

const MOCK_AGENTES = [
  { id: 1, nome: 'Maria José da Silva', microarea_nome: 'Microárea 01 - Baixa do Aragão', familias: 210, pacientes: 680 },
  { id: 2, nome: 'Francisco Alves de Sousa', microarea_nome: 'Microárea 02 - Centro', familias: 185, pacientes: 590 },
  { id: 3, nome: 'Ana Cláudia Ferreira', microarea_nome: 'Microárea 03 - Piauí', familias: 230, pacientes: 720 },
  { id: 4, nome: 'José Ribamar Costa', microarea_nome: 'Microárea 04 - Frei Higino', familias: 195, pacientes: 615 },
  { id: 5, nome: 'Francisca das Chagas Lima', microarea_nome: 'Microárea 05 - Pindorama', familias: 220, pacientes: 695 },
];

const MAP_CENTER = [-2.9045, -41.7745];
const MAP_ZOOM = 13;

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

  const [kpis, setKpis] = useState(MOCK_KPIS);
  const [agentes, setAgentes] = useState(MOCK_AGENTES);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [kpisData, agentesData] = await Promise.all([
        gestaoEquipesService.getKpis(),
        gestaoEquipesService.getAgentes(),
      ]);
      setKpis(kpisData || MOCK_KPIS);
      setAgentes(Array.isArray(agentesData) && agentesData.length > 0 ? agentesData : MOCK_AGENTES);
    } catch {
      // Fallback silencioso para dados mockados
      setKpis(MOCK_KPIS);
      setAgentes(MOCK_AGENTES);
      notify({ type: 'warning', message: 'Usando dados de demonstração. Conexão com o servidor indisponível.' });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalFamilias = agentes.reduce((acc, a) => acc + (a.familias || 0), 0);
  const totalPacientes = agentes.reduce((acc, a) => acc + (a.pacientes || 0), 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* ── Cabeçalho ───────────────────────────────────────────── */}
      <div className="mb-8 rise-fade">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Gestão de Equipes e Microáreas
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
          Acompanhe os indicadores do território e a cobertura das microáreas.
        </p>
      </div>

      {/* ── Loading spinner ─────────────────────────────────────── */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      )}

      {!loading && (
        <>
          {/* ── Seção 1: KPIs ───────────────────────────────────── */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 rise-fade stagger-1">
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
              icon={ChartBarIcon}
              value={`${kpis.cobertura_esf || 0}%`}
              label="Cobertura ESF"
              color="bg-violet-600"
            />
          </section>

          {/* ── Seção 2: Tabela de ACS ──────────────────────────── */}
          <section className="mb-8 rise-fade stagger-2">
            <div className="bg-white dark:bg-slate-900 shadow-md rounded-lg overflow-hidden">
              {/* Header */}
              <div className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4">
                <div className="flex items-center gap-3">
                  <UserCircleIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                      Agentes Comunitários de Saúde
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                      {agentes.length} agentes &middot; {totalFamilias} famílias &middot; {totalPacientes.toLocaleString('pt-BR')} pacientes
                    </p>
                  </div>
                </div>
              </div>

              {/* Tabela desktop */}
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
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Pacientes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {agentes.map((agente) => (
                      <tr key={agente.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                              <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                                {(agente.nome || '').split(' ').map(n => n[0]).slice(0, 2).join('')}
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cards mobile */}
              <div className="md:hidden p-4 space-y-3">
                {agentes.map((agente) => (
                  <div
                    key={agente.id}
                    className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                        <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                          {(agente.nome || '').split(' ').map(n => n[0]).slice(0, 2).join('')}
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
                        {agente.familias} famílias
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                        {agente.pacientes} pacientes
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Seção 3: Mapa do Território ─────────────────────── */}
          <section className="rise-fade stagger-3">
            <div className="bg-white dark:bg-slate-900 shadow-md rounded-lg overflow-hidden">
              {/* Header */}
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

              {/* Mapa */}
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

                  {/* Futuro: adicionar camadas GeoJSON para delimitar microáreas
                      <GeoJSON data={geoJsonMicroareas} style={(feature) => ({
                        fillColor: feature.properties.color,
                        weight: 2,
                        opacity: 1,
                        color: '#fff',
                        fillOpacity: 0.5,
                      })} onEachFeature={(feature, layer) => {
                        layer.bindPopup(feature.properties.nome);
                      }} />
                  */}
                </MapContainer>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default GestaoEquipesMicroareas;
