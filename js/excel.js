document.addEventListener('DOMContentLoaded', () => {
  const storeInput = document.getElementById('store-name');
  const exportBtn = document.getElementById('export-excel');

  if (storeInput) {
    storeInput.value = plan.storeName || '';
    storeInput.addEventListener('input', () => {
      plan.storeName = storeInput.value.trim();
      savePlan(plan);
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', exportExcel);
  }
});

function statusLabel(status) {
  const map = { todo: 'A fazer', doing: 'Fazendo', done: 'Feito', unassigned: 'Não atribuído' };
  return map[status] || status || '—';
}

function termLabel(term) {
  const map = { short: 'Curto prazo', medium: 'Médio prazo', long: 'Longo prazo' };
  return map[term] || term || '—';
}

function yesNo(value) {
  return value ? 'Sim' : 'Não';
}

function getSwotItems(key) {
  const raw = (plan.swot && plan.swot[key]) || '';
  const fromString = raw.split('\n').map(s => s.trim()).filter(Boolean);
  if (fromString.length > 0) return fromString;

  // Fallback para dados antigos no formato cards
  const cards = (plan.swot && plan.swot.cards) || [];
  const fieldToCategory = {
    forces: 'Força',
    weaknesses: 'Fraqueza',
    opportunities: 'Oportunidade',
    threats: 'Ameaça'
  };
  return cards
    .filter(c => c.category === fieldToCategory[key] || c.userChoice === fieldToCategory[key])
    .map(c => c.text);
}

function buildSwotAnalysisSheet() {
  const dateStr = new Date().toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  const rows = [];

  rows.push([`SWOT ${dateStr}`, null, null, null]);
  rows.push([]);
  rows.push(['💪 FORÇAS (STRENGTHS)', null, '⚠️ FRAQUEZAS (WEAKNESSES)', null]);

  const forces = getSwotItems('forces').map(t => '• ' + t);
  const weaknesses = getSwotItems('weaknesses').map(t => '• ' + t);
  const maxTop = Math.max(forces.length, weaknesses.length, 1);

  for (let i = 0; i < maxTop; i++) {
    rows.push([forces[i] || '', null, weaknesses[i] || '', null]);
  }

  rows.push([]);
  rows.push(['🚀 OPORTUNIDADES (OPPORTUNITIES)', null, '🛑 AMEAÇAS (THREATS)', null]);

  const opportunities = getSwotItems('opportunities').map(t => '• ' + t);
  const threats = getSwotItems('threats').map(t => '• ' + t);
  const maxBottom = Math.max(opportunities.length, threats.length, 1);

  for (let i = 0; i < maxBottom; i++) {
    rows.push([opportunities[i] || '', null, threats[i] || '', null]);
  }

  return rows;
}

function buildPillarsSheet() {
  const rows = [];
  const pillars = Object.keys(plan.pillars || {});

  rows.push(['Nossa Visão', null, null, null, null]);
  rows.push([]);
  rows.push(['Pilares Estratégicos', null, null, null, null]);
  rows.push(pillars.length ? pillars : ['(nenhum pilar definido)', null, null, null, null]);
  rows.push([]);

  const maxRows = Math.max(...pillars.map(p => (plan.pillars[p] || []).length), 1);
  for (let i = 0; i < maxRows; i++) {
    const line = pillars.map(p => (plan.pillars[p] || [])[i] || '');
    rows.push(line);
  }

  return rows;
}

function buildSmartSheet(storeName) {
  const rows = [];
  rows.push([null, `METAS SMART — ${storeName.toUpperCase()}`, null, null, null, null, null, null, null, null]);
  rows.push([null, null, null, null, null, null, null, null, null, null]);
  rows.push([null, null, null, null, null, null, null, null, null, null]);
  rows.push([null, null, null, null, null, null, null, null, null, null]);
  rows.push([
    null,
    'Meta',
    'Descrição',
    'Indicador-Chave (KPI)',
    'Origem SWOT',
    'Prazo',
    'Específica',
    'Mensurável',
    'Alcançável',
    'Relevante',
    'Temporal'
  ]);

  (plan.goals || []).forEach(g => {
    const checks = evaluateSmart(g.text || '');
    rows.push([
      null,
      g.pillar || 'Geral',
      g.text || '',
      '',
      '',
      '',
      yesNo(checks.specific),
      yesNo(checks.measurable),
      yesNo(checks.achievable),
      yesNo(checks.relevant),
      yesNo(checks.timeBound)
    ]);
  });

  return rows;
}

function buildInitiativesSheet(storeName) {
  const rows = [];
  rows.push([null, `METAS SMART — ${storeName.toUpperCase()}`, null, null, null, null, null, null]);
  rows.push([null, null, null, null, null, null, null, null]);
  rows.push([null, null, null, null, null, null, null, null]);
  rows.push([null, null, null, null, null, null, null, null]);
  rows.push([
    null,
    'Meta',
    'Descrição',
    'Específica',
    'Mensurável',
    'Alcançável',
    'Relevante',
    'Temporal'
  ]);

  const goals = plan.goals || [];
  (plan.initiatives || []).forEach(i => {
    const linkedGoal = goals.find(g => g.id === i.goalId);
    const goalText = linkedGoal ? linkedGoal.text : '';
    const checks = evaluateSmart(goalText);
    rows.push([
      null,
      linkedGoal ? linkedGoal.pillar || 'Geral' : '',
      i.title || '',
      yesNo(checks.specific),
      yesNo(checks.measurable),
      yesNo(checks.achievable),
      yesNo(checks.relevant),
      yesNo(checks.timeBound)
    ]);
  });

  return rows;
}

function buildRoadmapSheet() {
  const rows = [];
  rows.push(['Trimestre', '#', 'Meta principal', 'Projeto / Iniciativa', 'Entrega estimada']);

  const goals = plan.goals || [];
  (plan.initiatives || []).forEach((i, idx) => {
    const linkedGoal = goals.find(g => g.id === i.goalId);
    const term = plan.roadmap[i.id];
    rows.push([
      term ? termLabel(term) : '',
      idx + 1,
      linkedGoal ? linkedGoal.text : '',
      i.title || '',
      i.due || ''
    ]);
  });

  return rows;
}

function evaluateSmart(text) {
  const lower = (text || '').toLowerCase();
  return {
    specific: /aumentar|reduzir|melhorar|lançar|criar|implementar/.test(lower),
    measurable: /\d|R\$|pct|por cento|%|mil|milhão/.test(lower),
    achievable: (text || '').length > 15,
    relevant: /venda|faturamento|cliente|estoque|conversão|tráfego/.test(lower),
    timeBound: /em \d|dentro de|\d meses|\d dias|prazo/.test(lower)
  };
}

function exportExcel() {
  if (typeof XLSX === 'undefined') {
    alert('Biblioteca de Excel não carregada. Tente novamente em alguns segundos.');
    return;
  }

  const storeName = (plan.storeName || '').trim() || 'Minha Empresa';
  const fileName = `Workflow PE - ${storeName} - v1.xlsx`;

  const wb = XLSX.utils.book_new();

  const swotWs = XLSX.utils.aoa_to_sheet(buildSwotAnalysisSheet());
  swotWs['!cols'] = [{ wch: 60 }, { wch: 3 }, { wch: 60 }, { wch: 3 }];
  XLSX.utils.book_append_sheet(wb, swotWs, 'SWOT Analysis');

  const pillarsWs = XLSX.utils.aoa_to_sheet(buildPillarsSheet());
  const pillarCount = Math.max(Object.keys(plan.pillars || {}).length, 1);
  pillarsWs['!cols'] = Array(pillarCount).fill({ wch: 40 });
  XLSX.utils.book_append_sheet(wb, pillarsWs, 'Pilares estratégicos');

  const smartWs = XLSX.utils.aoa_to_sheet(buildSmartSheet(storeName));
  smartWs['!cols'] = [
    { wch: 3 }, { wch: 18 }, { wch: 50 }, { wch: 35 }, { wch: 18 },
    { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }
  ];
  XLSX.utils.book_append_sheet(wb, smartWs, 'Metas SMART');

  const initiativesWs = XLSX.utils.aoa_to_sheet(buildInitiativesSheet(storeName));
  initiativesWs['!cols'] = [
    { wch: 3 }, { wch: 18 }, { wch: 50 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }
  ];
  XLSX.utils.book_append_sheet(wb, initiativesWs, 'Lista de iniciativas');

  const roadmapWs = XLSX.utils.aoa_to_sheet(buildRoadmapSheet());
  roadmapWs['!cols'] = [{ wch: 16 }, { wch: 6 }, { wch: 50 }, { wch: 50 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, roadmapWs, 'Roadmap');

  XLSX.writeFile(wb, fileName);
}
