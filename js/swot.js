const categoryMap = {
  Força: { field: 'forces', elId: 'swot2-forca' },
  Fraqueza: { field: 'weaknesses', elId: 'swot2-fraqueza' },
  Oportunidade: { field: 'opportunities', elId: 'swot2-oportunidade' },
  Ameaça: { field: 'threats', elId: 'swot2-ameaca' }
};

const exampleItems = [
  { text: 'Boa reputação no marketplace', category: 'Força' },
  { text: 'Estoque próprio e logística ágil', category: 'Força' },
  { text: 'Dependência de um único fornecedor', category: 'Fraqueza' },
  { text: 'Falta de presença em redes sociais', category: 'Fraqueza' },
  { text: 'Alta do Pix e do social commerce', category: 'Oportunidade' },
  { text: 'Crescimento do TikTok Shop', category: 'Oportunidade' },
  { text: 'Guerra de preços entre concorrentes', category: 'Ameaça' },
  { text: 'Mudanças nas regras do marketplace', category: 'Ameaça' }
];

let draggedText = null;

function renderSwot() {
  if (!plan.swot.pendingItems) plan.swot.pendingItems = [];

  setupSwotInput();
  setupDropZones();
  renderPendingCards();
  renderQuadrants();
  updateSwotStats();
}

function handleAddSwotClick() {
  const input = document.getElementById('swot2-input');
  addSwotItem(input ? input.value.trim() : '');
}

function setupSwotInput() {
  const input = document.getElementById('swot2-input');
  const examplesBtn = document.getElementById('swot2-examples');

  if (input && !input.dataset.setup) {
    input.dataset.setup = 'true';
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addSwotItem(input.value.trim());
      }
    });
  }

  if (examplesBtn && !examplesBtn.dataset.setup) {
    examplesBtn.dataset.setup = 'true';
    examplesBtn.addEventListener('click', fillSwotExamples);
  }
}

function addSwotItem(text) {
  if (!text) {
    const input = document.getElementById('swot2-input');
    if (input) input.focus();
    return;
  }

  plan.swot.pendingItems.push(text);
  savePlan(plan);

  const input = document.getElementById('swot2-input');
  if (input) {
    input.value = '';
    input.focus();
  }

  renderPendingCards();
  updateSwotStats();
}

function removePendingItem(index) {
  plan.swot.pendingItems.splice(index, 1);
  savePlan(plan);
  renderPendingCards();
  updateSwotStats();
}

function movePendingToCategory(index, category) {
  if (isNaN(index) || index < 0 || index >= plan.swot.pendingItems.length) return;

  const text = plan.swot.pendingItems[index];
  const field = categoryMap[category].field;
  const items = getFieldItems(field);

  if (items.includes(text)) return;

  plan.swot.pendingItems.splice(index, 1);
  items.push(text);
  plan.swot[field] = items.join('\n');

  savePlan(plan);
  renderPendingCards();
  renderQuadrants();
  updateSwotStats();
}

function removeItemFromCategory(text, category) {
  const field = categoryMap[category].field;
  const items = getFieldItems(field).filter(item => item !== text);
  plan.swot[field] = items.join('\n');

  savePlan(plan);
  renderQuadrants();
  updateSwotStats();
}

function fillSwotExamples() {
  exampleItems.forEach(({ text, category }) => {
    const field = categoryMap[category].field;
    const items = getFieldItems(field);
    if (!items.includes(text)) {
      items.push(text);
      plan.swot[field] = items.join('\n');
    }
  });

  savePlan(plan);
  renderQuadrants();
  updateSwotStats();
}

function getFieldItems(field) {
  return (plan.swot[field] || '').split('\n').map(s => s.trim()).filter(Boolean);
}

function renderPendingCards() {
  const container = document.getElementById('swot2-pending-cards');
  if (!container) return;

  container.innerHTML = '';

  if (plan.swot.pendingItems.length === 0) {
    container.innerHTML = '<span class="swot2-empty">Nenhuma situação pendente. Adicione uma acima.</span>';
    return;
  }

  plan.swot.pendingItems.forEach((text, idx) => {
    const card = createSwotCard(text, idx, true);
    container.appendChild(card);
  });
}

function renderQuadrants() {
  Object.keys(categoryMap).forEach(category => {
    const { field, elId } = categoryMap[category];
    const container = document.getElementById(elId);
    if (!container) return;

    container.innerHTML = '';
    const items = getFieldItems(field);

    items.forEach(text => {
      const card = createSwotCard(text, null, false, category);
      container.appendChild(card);
    });
  });
}

function createSwotCard(text, idx, isPending, category) {
  const card = document.createElement('div');
  card.className = 'swot2-card';
  card.draggable = true;
  card.dataset.text = text;
  if (isPending && idx !== null) card.dataset.pendingIdx = idx;

  const quickActions = isPending ? `
    <div class="swot2-card-actions">
      <button type="button" class="swot2-action forca" title="Mover para Forças" aria-label="Mover para Forças">💪</button>
      <button type="button" class="swot2-action fraqueza" title="Mover para Fraquezas" aria-label="Mover para Fraquezas">⚠️</button>
      <button type="button" class="swot2-action oportunidade" title="Mover para Oportunidades" aria-label="Mover para Oportunidades">🚀</button>
      <button type="button" class="swot2-action ameaca" title="Mover para Ameaças" aria-label="Mover para Ameaças">⛔</button>
    </div>
  ` : '';

  card.innerHTML = `
    <div class="swot2-card-main">
      <span class="swot2-card-text">${escapeHtml(text)}</span>
      <button type="button" class="swot2-delete-card" aria-label="Remover">×</button>
    </div>
    ${quickActions}
  `;

  card.querySelector('.swot2-delete-card').addEventListener('click', (e) => {
    e.stopPropagation();
    if (isPending) {
      removePendingItem(idx);
    } else {
      removeItemFromCategory(text, category);
    }
  });

  if (isPending) {
    const actionMap = [
      { selector: '.swot2-action.forca', category: 'Força' },
      { selector: '.swot2-action.fraqueza', category: 'Fraqueza' },
      { selector: '.swot2-action.oportunidade', category: 'Oportunidade' },
      { selector: '.swot2-action.ameaca', category: 'Ameaça' }
    ];

    actionMap.forEach(({ selector, category }) => {
      const btn = card.querySelector(selector);
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          movePendingToCategory(idx, category);
        });
      }
    });
  }

  card.addEventListener('dragstart', (e) => {
    draggedText = { text, idx, isPending, category };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', text);
    card.style.opacity = '0.5';
  });

  card.addEventListener('dragend', () => {
    draggedText = null;
    card.style.opacity = '1';
    document.querySelectorAll('.swot2-quadrant, .swot2-pending').forEach(zone => {
      zone.classList.remove('drag-over');
    });
  });

  return card;
}

function setupDropZones() {
  const pendingZone = document.getElementById('swot2-pending');

  if (pendingZone && !pendingZone.dataset.setup) {
    pendingZone.dataset.setup = 'true';
    pendingZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      pendingZone.classList.add('drag-over');
    });

    pendingZone.addEventListener('dragleave', () => {
      pendingZone.classList.remove('drag-over');
    });

    pendingZone.addEventListener('drop', (e) => {
      e.preventDefault();
      pendingZone.classList.remove('drag-over');
      if (!draggedText || draggedText.isPending) return;

      removeItemFromCategory(draggedText.text, draggedText.category);
      plan.swot.pendingItems.push(draggedText.text);
      savePlan(plan);
      renderPendingCards();
      renderQuadrants();
      updateSwotStats();
    });
  }

  Object.keys(categoryMap).forEach(category => {
    const zone = document.querySelector(`.swot2-quadrant[data-category="${category}"]`);
    if (!zone || zone.dataset.setup) return;
    zone.dataset.setup = 'true';

    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('drag-over');
    });

    zone.addEventListener('dragleave', () => {
      zone.classList.remove('drag-over');
    });

    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      if (!draggedText) return;

      if (draggedText.isPending) {
        movePendingToCategory(draggedText.idx, category);
      } else if (draggedText.category !== category) {
        removeItemFromCategory(draggedText.text, draggedText.category);
        const field = categoryMap[category].field;
        const items = getFieldItems(field);
        if (!items.includes(draggedText.text)) {
          items.push(draggedText.text);
          plan.swot[field] = items.join('\n');
          savePlan(plan);
          renderQuadrants();
          updateSwotStats();
        }
      }
    });
  });
}

function updateSwotStats() {
  let total = plan.swot.pendingItems.length;

  Object.keys(categoryMap).forEach(category => {
    const { field } = categoryMap[category];
    const items = getFieldItems(field);
    total += items.length;

    const countEl = document.querySelector(`.swot2-count[data-category="${category}"]`);
    if (countEl) {
      countEl.textContent = `${items.length} ${items.length === 1 ? 'situação' : 'situações'}`;
    }
  });

  const totalEl = document.getElementById('swot2-total-items');
  if (totalEl) totalEl.textContent = total;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
