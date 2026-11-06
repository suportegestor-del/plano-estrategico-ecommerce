const STORAGE_KEY = 'ecommerce-plan-v1';

// Pilares da "casa": 4 pilares estratégicos + 3 de fundação
const PILLAR_ORDER = [
  'Crescimento',
  'Portfólio e Canal',
  'Excelência Operacional',
  'Novos Negócios / Inovação',
  'Finanças',
  'Pessoas e Processos',
  'Tecnologia'
];

// Mapeia nomes de pilares de versões antigas para a estrutura atual
const PILLAR_RENAME = {
  'Operação': 'Excelência Operacional',
  'Inovação': 'Novos Negócios / Inovação',
  'Experiência do Cliente': 'Portfólio e Canal'
};

const defaultPlan = {
  currentStep: 1,
  storeName: '',
  swot: {
    forces: '',
    weaknesses: '',
    opportunities: '',
    threats: '',
    cards: [],
    pendingItems: []
  },
  crossStrategies: [],
  pillars: {},
  goals: [],
  initiatives: [],
  roadmap: {}
};

function loadPlan() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return migratePlan(deepMerge(defaultPlan, parsed));
    }
  } catch (e) {
    console.error('Erro ao carregar plano', e);
  }
  return JSON.parse(JSON.stringify(defaultPlan));
}

function migratePlan(plan) {
  if (typeof plan.storeName !== 'string') plan.storeName = '';

  // Normaliza a seção SWOT, tolerando dados de versões antigas em formatos diferentes
  if (!plan.swot || typeof plan.swot !== 'object' || Array.isArray(plan.swot)) {
    plan.swot = JSON.parse(JSON.stringify(defaultPlan.swot));
  }

  ['forces', 'weaknesses', 'opportunities', 'threats'].forEach(field => {
    let value = plan.swot[field];
    if (Array.isArray(value)) value = value.join('\n');
    if (typeof value !== 'string') value = '';
    const items = value.split('\n').map(s => s.trim()).filter(Boolean);
    plan.swot[field] = [...new Set(items)].join('\n');
  });

  let pending = plan.swot.pendingItems;
  if (typeof pending === 'string') pending = pending.split('\n');
  if (!Array.isArray(pending)) pending = [];
  pending = pending.map(s => (typeof s === 'string' ? s.trim() : '')).filter(Boolean);
  plan.swot.pendingItems = [...new Set(pending)];

  // Padroniza estratégias cruzadas para o formato { id, type, a: [], b: [], strategy, review }
  const toTextArr = (v) => Array.isArray(v)
    ? v.filter(x => typeof x === 'string' && x.trim()).map(x => x.trim())
    : (typeof v === 'string' && v.trim() ? [v.trim()] : []);
  plan.crossStrategies = (plan.crossStrategies || []).map((s, idx) => {
    let type = s.type, a = s.a, b = s.b;
    if (!type) {
      type = 'FO'; a = ''; b = '';
      if (s.force && s.opportunity) { type = 'FO'; a = s.force; b = s.opportunity; }
      else if (s.force && s.threat) { type = 'FA'; a = s.force; b = s.threat; }
      else if (s.weakness && s.opportunity) { type = 'WO'; a = s.weakness; b = s.opportunity; }
      else if (s.weakness && s.threat) { type = 'WT'; a = s.weakness; b = s.threat; }
    }
    return {
      id: s.id || 'cs-' + idx,
      type,
      a: toTextArr(a),
      b: toTextArr(b),
      strategy: s.strategy || '',
      review: typeof s.review === 'string' ? s.review : ''
    };
  });

  // Renomeia pilares de versões antigas para a estrutura atual da "casa"
  if (plan.pillars && typeof plan.pillars === 'object' && !Array.isArray(plan.pillars)) {
    const renamed = {};
    Object.keys(plan.pillars).forEach(name => {
      const newName = PILLAR_RENAME[name] || name;
      renamed[newName] = plan.pillars[name];
    });
    plan.pillars = renamed;
  }
  (plan.goals || []).forEach(g => {
    if (g.pillar && PILLAR_RENAME[g.pillar]) g.pillar = PILLAR_RENAME[g.pillar];
  });

  // Garante id em metas e iniciativas
  (plan.goals || []).forEach((g, idx) => {
    if (!g.id) g.id = 'goal-' + idx;
  });
  (plan.initiatives || []).forEach((i, idx) => {
    if (!i.id) i.id = 'init-' + idx;
  });

  return plan;
}

function savePlan(plan) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  } catch (e) {
    console.error('Erro ao salvar plano', e);
  }
}

function exportBackup() {
  const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'backup-plano-estrategico.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importBackup(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        Object.assign(plan, migratePlan(deepMerge(defaultPlan, data)));
        savePlan(plan);
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function deepMerge(base, override) {
  const result = JSON.parse(JSON.stringify(base));
  for (const key in override) {
    if (override[key] !== null && typeof override[key] === 'object' && !Array.isArray(override[key])) {
      result[key] = deepMerge(result[key] || {}, override[key]);
    } else {
      result[key] = override[key];
    }
  }
  return result;
}

const plan = loadPlan();

window.addEventListener('beforeunload', () => savePlan(plan));
