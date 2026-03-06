/**
 * Bairros de Parnaíba - PI
 * Coordenadas centrais obtidas via Nominatim/OpenStreetMap.
 * Polígonos hexagonais ao redor do centro real de cada bairro.
 */

const COLORS = [
  '#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed',
  '#db2777', '#0891b2', '#65a30d', '#ea580c', '#4f46e5',
  '#059669', '#e11d48', '#0d9488', '#c026d3', '#ca8a04',
  '#6366f1', '#14b8a6', '#f43f5e', '#8b5cf6', '#f97316',
  '#10b981', '#ef4444', '#06b6d4', '#84cc16', '#a855f7',
  '#ec4899', '#22c55e', '#3b82f6', '#eab308',
];

function hexPolygon(lat, lon, r = 0.006) {
  const coords = [];
  for (let i = 0; i <= 6; i++) {
    const angle = Math.PI / 6 + (2 * Math.PI * (i % 6)) / 6;
    coords.push([
      Math.round((lon + r * Math.cos(angle)) * 1e6) / 1e6,
      Math.round((lat + r * Math.sin(angle)) * 1e6) / 1e6,
    ]);
  }
  return [coords];
}

const BAIRROS_RAW = [
  // [nome, id, lat, lon] — coordenadas reais do Nominatim
  ['Centro', 'centro', -2.9050541, -41.7771221],
  ['Piauí', 'piaui', -2.9227755, -41.7442960],
  ['São José', 'sao_jose', -2.9081295, -41.7854457],
  ['Pindorama', 'pindorama', -2.9117962, -41.7584552],
  ['Frei Higino', 'frei_higino', -2.9147752, -41.7435622],
  ['Rodoviária', 'rodoviaria', -2.9257258, -41.7510510],
  ['Campos Elíseos', 'campos_eliseos', -2.8960, -41.7690],
  ['São Francisco', 'sao_francisco', -2.9163736, -41.7670125],
  ['Dirceu Arcoverde', 'dirceu_arcoverde', -2.9318876, -41.7414251],
  ['Nova Parnaíba', 'nova_parnaiba', -2.9140250, -41.7783316],
  ['São Benedito', 'sao_benedito', -2.9054317, -41.7584753],
  ['Tabuleiro', 'tabuleiro', -2.9329714, -41.7894093],
  ['Boa Esperança', 'boa_esperanca', -2.9177861, -41.7579389],
  ['Nossa Sra. de Fátima', 'fatima', -2.9061417, -41.7687609],
  ['Reis Veloso', 'reis_veloso', -2.9061603, -41.7412019],
  ['Planalto', 'planalto', -2.9164767, -41.7325259],
  ['João XXIII', 'joao_xxiii', -2.9063960, -41.7233706],
  ['Mendonça Clark', 'mendonca_clark', -2.9044250, -41.7832096],
  ['Santa Luzia', 'santa_luzia', -2.9296689, -41.7627776],
  ['Bebedouro', 'bebedouro', -2.9213113, -41.7721868],
  ['São Vicente de Paulo', 'sao_vicente', -2.9383478, -41.7743325],
  ['Ilha Grande de Santa Isabel', 'ilha_grande', -2.8417960, -41.7711706],
  ['Ceará', 'ceara', -2.9271295, -41.7586577],
  ['São Judas Tadeu', 'sao_judas', -2.8995813, -41.7403436],
  ['Nossa Sra. do Carmo', 'ns_carmo', -2.8982010, -41.7777998],
  ['Baixa do Aragão', 'baixa_aragao', -2.9404524, -41.7415979],
  ['Catanduva', 'catanduva', -2.9350, -41.7320],
  ['Tucuns', 'tucuns', -2.9200, -41.7850],
  ['Quarenta', 'quarenta', -2.9252, -41.7475],
];

const bairrosParnaiba = {
  type: 'FeatureCollection',
  features: BAIRROS_RAW.map(([nome, id, lat, lon], i) => ({
    type: 'Feature',
    properties: {
      nome,
      id,
      color: COLORS[i % COLORS.length],
      center: [lat, lon],
    },
    geometry: {
      type: 'Polygon',
      coordinates: hexPolygon(lat, lon, id === 'ilha_grande' ? 0.012 : 0.006),
    },
  })),
};

export default bairrosParnaiba;
export { COLORS };
