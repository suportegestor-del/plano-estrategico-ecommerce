const STORAGE_KEY = 'ecommerce-plan-v1';

const defaultPlan = {
  currentStep: 1,
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
  // Padroniza estratégias cruzadas para o formato { id, type, a, b, strategy }
  plan.crossStrategies = (plan.crossStrategies || []).map((s, idx) => {
    if (s.type && s.a && s.b) return s;
    let type = 'FO', a = '', b = '';
    if (s.force && s.opportunity) { type = 'FO'; a = s.force; b = s.opportunity; }
    else if (s.force && s.threat) { type = 'FA'; a = s.force; b = s.threat; }
    else if (s.weakness && s.opportunity) { type = 'WO'; a = s.weakness; b = s.opportunity; }
    else if (s.weakness && s.threat) { type = 'WT'; a = s.weakness; b = s.threat; }
    return { id: s.id || 'cs-' + idx, type, a, b, strategy: s.strategy || '' };
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
