function getSwotItems() {
  const parse = (text) => (text || '').split('\n').map(s => s.trim()).filter(Boolean);
  return {
    forces: parse(plan.swot.forces),
    weaknesses: parse(plan.swot.weaknesses),
    opportunities: parse(plan.swot.opportunities),
    threats: parse(plan.swot.threats)
  };
}

function getCombinations() {
  const items = getSwotItems();
  const combos = [
    { type: 'FO', aLabel: 'Força', bLabel: 'Oportunidade', a: items.forces[0] || '', b: items.opportunities[0] || '' },
    { type: 'FA', aLabel: 'Força', bLabel: 'Ameaça', a: items.forces[1] || items.forces[0] || '', b: items.threats[0] || '' },
    { type: 'WO', aLabel: 'Fraqueza', bLabel: 'Oportunidade', a: items.weaknesses[0] || '', b: items.opportunities[1] || items.opportunities[0] || '' },
    { type: 'WT', aLabel: 'Fraqueza', bLabel: 'Ameaça', a: items.weaknesses[1] || items.weaknesses[0] || '', b: items.threats[1] || items.threats[0] || '' }
  ];
  return combos.filter(c => c.a && c.b);
}

function getTypeExplanation(type) {
  const map = {
    FO: 'Como usar essa força para aproveitar a oportunidade?',
    FA: 'Como usar essa força para se proteger dessa ameaça?',
    WO: 'Como resolver essa fraqueza para não perder a oportunidade?',
    WT: 'Como se defender dessa ameaça sem depender desse ponto fraco?'
  };
  return map[type] || 'Como conectar esses dois itens?';
}

function renderSwotCross() {
  const grid = document.getElementById('cross-grid');
  const list = document.getElementById('strategies-list');
  const feedback = document.getElementById('cross-feedback');

  if (!plan.crossStrategies) plan.crossStrategies = [];

  const combos = getCombinations();

  if (combos.length === 0) {
    if (grid) grid.innerHTML = '';
    if (list) list.innerHTML = '';
    if (feedback) {
      feedback.textContent = 'Preencha pelo menos uma força, uma fraqueza, uma oportunidade e uma ameaça no SWOT para criar os cruzamentos.';
      feedback.className = 'swot-feedback hint';
    }
    return;
  }

  if (feedback) {
    feedback.textContent = 'Escreva uma estratégia para cada combinação e clique em Adicionar.';
    feedback.className = 'swot-feedback';
  }

  if (grid) {
    grid.innerHTML = '';
    combos.forEach((combo, idx) => {
      const existing = plan.crossStrategies.find(s => s.type === combo.type && s.a === combo.a && s.b === combo.b);
      const card = document.createElement('div');
      card.className = 'cross-card';
      card.dataset.type = combo.type;
      card.innerHTML = `
        <div class="cross-card-header">
          <span class="cross-type">${combo.type}</span>
          <span class="cross-question">${getTypeExplanation(combo.type)}</span>
        </div>
        <div class="cross-items">
          <div class="cross-item"><strong>${combo.aLabel}</strong><p>${escapeHtml(combo.a)}</p></div>
          <span class="cross-plus">+</span>
          <div class="cross-item"><strong>${combo.bLabel}</strong><p>${escapeHtml(combo.b)}</p></div>
        </div>
        <div class="cross-input-row">
          <input type="text" id="strategy-${combo.type}" value="${existing ? escapeHtml(existing.strategy) : ''}" placeholder="Sua estratégia para essa combinação">
          <button class="btn btn-small add-cross-strategy" data-type="${combo.type}" data-a="${escapeHtml(combo.a)}" data-b="${escapeHtml(combo.b)}">Adicionar</button>
        </div>
      `;
      grid.appendChild(card);
    });

    grid.querySelectorAll('.add-cross-strategy').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        const a = btn.dataset.a;
        const b = btn.dataset.b;
        const input = document.getElementById(`strategy-${type}`);
        if (!input) return;
        const value = input.value.trim();
        if (!value) {
          setCrossFeedback(`Digite uma estratégia para ${type} antes de adicionar.`, 'hint');
          return;
        }

        const idx = plan.crossStrategies.findIndex(s => s.type === type && s.a === a && s.b === b);
        if (idx >= 0) {
          plan.crossStrategies[idx].strategy = value;
        } else {
          plan.crossStrategies.push({ id: 'cs-' + Date.now(), type, a, b, strategy: value });
        }
        savePlan(plan);
        setCrossFeedback(`Estratégia ${type} salva.`, 'success');
        renderSwotCross();
      });
    });
  }

  if (list) {
    list.innerHTML = '';
    plan.crossStrategies.forEach((s, idx) => {
      const chip = document.createElement('div');
      chip.className = 'item-chip';
      chip.innerHTML = `
        <div>
          <div>${escapeHtml(s.strategy)}</div>
          <small>${escapeHtml(s.type)}: ${escapeHtml(s.a)} + ${escapeHtml(s.b)}</small>
        </div>
        <button class="btn btn-small btn-secondary remove-strategy" data-idx="${idx}">Remover</button>
      `;
      list.appendChild(chip);
    });

    list.querySelectorAll('.remove-strategy').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.idx);
        plan.crossStrategies.splice(idx, 1);
        savePlan(plan);
        renderSwotCross();
      });
    });
  }
}

function setCrossFeedback(message, state) {
  const feedback = document.getElementById('cross-feedback');
  if (!feedback) return;
  feedback.textContent = message;
  feedback.className = `swot-feedback${state ? ` ${state}` : ''}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
