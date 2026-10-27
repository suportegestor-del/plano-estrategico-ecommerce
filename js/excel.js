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

function buildSwotSheet() {
  const rows = [];
  const categories = [
    { label: 'Forças', key: 'forces' },
    { label: 'Fraquezas', key: 'weaknesses' },
    { label: 'Oportunidades', key: 'opportunities' },
    { label: 'Ameaças', key: 'threats' }
  ];

  categories.forEach(cat => {
    const raw = plan.swot[cat.key] || '';
    const items = raw.split('\n').map(s => s.trim()).filter(Boolean);
    rows.push({ Tipo: cat.label, Itens: items.join('; ') || '(vazio)' });
  });

  return rows;
}

function buildStrategiesSheet() {
  return (plan.crossStrategies || []).map(s => ({
    Tipo: s.type || '',
    'Elemento A': s.a || '',
    'Elemento B': s.b || '',
    Estratégia: s.strategy || ''
  }));
}

function buildPillarsSheet() {
  const rows = [];
  Object.entries(plan.pillars || {}).forEach(([pillar, strategies]) => {
    rows.push({
      Pilar: pillar,
      Estratégias: (strategies || []).join('; ') || '(vazio)'
    });
  });
  return rows;
}

function buildGoalsSheet() {
  return (plan.goals || []).map(g => ({
    Pilar: g.pillar || 'Geral',
    Meta: g.text || ''
  }));
}

function buildInitiativesSheet() {
  const goals = plan.goals || [];
  return (plan.initiatives || []).map(i => {
    const linkedGoal = goals.find(g => g.id === i.goalId);
    return {
      Iniciativa: i.title || '',
      Responsável: i.owner || '',
      Prazo: i.due || '',
      Status: statusLabel(i.status),
      'Meta vinculada': linkedGoal ? linkedGoal.text : ''
    };
  });
}

function buildRoadmapSheet() {
  const rows = [];
  const terms = ['short', 'medium', 'long'];

  terms.forEach(term => {
    const items = (plan.initiatives || []).filter(i => plan.roadmap[i.id] === term);
    if (items.length === 0) {
      rows.push({ Prazo: termLabel(term), Iniciativa: '(vazio)', Responsável: '', PrazoIniciativa: '' });
      return;
    }
    items.forEach(i => {
      rows.push({
        Prazo: termLabel(term),
        Iniciativa: i.title || '',
        Responsável: i.owner || '',
        PrazoIniciativa: i.due || ''
      });
    });
  });

  return rows;
}

function exportExcel() {
  if (typeof XLSX === 'undefined') {
    alert('Biblioteca de Excel não carregada. Tente novamente em alguns segundos.');
    return;
  }

  const storeName = (plan.storeName || '').trim() || 'Minha Empresa';
  const fileName = `Workflow PE - ${storeName} - v1.xlsx`;

  const wb = XLSX.utils.book_new();

  const sheets = [
    { name: 'SWOT', data: buildSwotSheet() },
    { name: 'Estratégias', data: buildStrategiesSheet() },
    { name: 'Pilares', data: buildPillarsSheet() },
    { name: 'Metas SMART', data: buildGoalsSheet() },
    { name: 'Iniciativas', data: buildInitiativesSheet() },
    { name: 'Roadmap', data: buildRoadmapSheet() }
  ];

  sheets.forEach(sheet => {
    const ws = XLSX.utils.json_to_sheet(sheet.data);
    ws['!cols'] = autoWidth(sheet.data);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  });

  XLSX.writeFile(wb, fileName);
}

function autoWidth(data) {
  if (!data || data.length === 0) return [];
  const keys = Object.keys(data[0]);
  return keys.map(key => {
    const maxLength = Math.max(
      key.length,
      ...data.map(row => String(row[key] || '').length)
    );
    return { wch: Math.min(Math.max(maxLength + 2, 10), 80) };
  });
}
