const swotColors = {
  Força: '#22c55e',
  Fraqueza: '#f97316',
  Oportunidade: '#3b82f6',
  Ameaça: '#ef4444'
};

const categoryFields = {
  Força: 'forces',
  Fraqueza: 'weaknesses',
  Oportunidade: 'opportunities',
  Ameaça: 'threats'
};

function renderSwot() {
  if (!plan.swot.pendingItems) plan.swot.pendingItems = [];

  renderSwotInput();
  renderPendingItems();
  renderSwotZones();
  updateZoneCounts();

  const continueBtn = document.getElementById('swot-continue');
  if (continueBtn) {
    continueBtn.onclick = () => goToStep(2);
  }
}

function renderSwotInput() {
  const input = document.getElementById('swot-new-item');
  const btn = document.getElementById('swot-add-item');
  const examplesBtn = document.getElementById('swot-fill-examples');
  if (!input || !btn) return;

  input.onkeydown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addPendingItem(input.value.trim());
    }
  };

  btn.onclick = () => addPendingItem(input.value.trim());

  if (examplesBtn) {
    examplesBtn.onclick = () => fillSwotExamples();
  }
}

function fillSwotExamples() {
  const examples = {
    forces: ['Boa reputação no marketplace', 'Estoque próprio e logística ágil'],
    weaknesses: ['Dependência de um único fornecedor', 'Falta de presença em redes sociais'],
    opportunities: ['Alta do Pix e do social commerce', 'Crescimento do TikTok Shop'],
    threats: ['Guerra de preços entre concorrentes', 'Mudanças nas regras do marketplace']
  };

  Object.keys(examples).forEach(field => {
    const current = getItemsFromField(field);
    examples[field].forEach(text => {
      if (!current.includes(text)) {
        current.push(text);
      }
    });
    plan.swot[field] = current.join('\n');
  });

  savePlan(plan);
  setSwotFeedback('Exemplos preenchidos. Você pode continuar ou editar as situações.', 'success');
  renderSwot();
}

function addPendingItem(text) {
  if (!text) {
    setSwotFeedback('Digite uma situação antes de adicionar.', 'hint');
    return;
  }

  plan.swot.pendingItems.push(text);
  savePlan(plan);

  const input = document.getElementById('swot-new-item');
  if (input) input.value = '';

  setSwotFeedback('Situação adicionada. Arraste-a para a categoria certa.', 'success');
  renderSwot();
}

function removePendingItem(index) {
  plan.swot.pendingItems.splice(index, 1);
  savePlan(plan);
  renderSwot();
}

function renderPendingItems() {
  const container = document.getElementById('swot-pending-cards');
  if (!container) return;

  container.innerHTML = '';

  if (plan.swot.pendingItems.length === 0) {
    container.innerHTML = '<p class="swot-pending-empty">Nenhuma situação pendente. Adicione uma acima.</p>';
    return;
  }

  plan.swot.pendingItems.forEach((text, idx) => {
    const card = createPendingCard(text, idx);
    container.appendChild(card);
  });
}

function createPendingCard(text, idx) {
  const el = document.createElement('div');
  el.className = 'card swot-card';
  el.draggable = true;
  el.dataset.idx = idx;
  el.innerHTML = `<span>${escapeHtml(text)}</span>`;

  el.addEventListener('dragstart', (event) => {
    event.dataTransfer.setData('text/plain', String(idx));
    event.dataTransfer.effectAllowed = 'move';
    el.classList.add('dragging');
  });

  el.addEventListener('dragend', () => el.classList.remove('dragging'));

  return el;
}

function renderSwotZones() {
  document.querySelectorAll('.swot-zone').forEach(zone => {
    const category = zone.dataset.category;
    const cardsContainer = zone.querySelector('.swot-zone-cards');
    if (!cardsContainer) return;

    cardsContainer.innerHTML = '';
    const field = categoryFields[category];
    const items = getItemsFromField(field);

    items.forEach(text => {
      const card = createZoneCard(text, category);
      cardsContainer.appendChild(card);
    });

    zone.ondragover = (event) => {
      event.preventDefault();
      zone.classList.add('drag-over');
    };

    zone.ondragleave = (event) => {
      if (!zone.contains(event.relatedTarget)) zone.classList.remove('drag-over');
    };

    zone.ondrop = (event) => {
      event.preventDefault();
      zone.classList.remove('drag-over');
      const idx = Number(event.dataTransfer.getData('text/plain'));
      movePendingToCategory(idx, category);
    };
  });
}

function createZoneCard(text, category) {
  const color = swotColors[category] || '#64748b';
  const el = document.createElement('div');
  el.className = 'swot-numbered-card';
  el.style.borderLeftColor = color;
  el.innerHTML = `
    <span class="swot-card-text">${escapeHtml(text)}</span>
    <button type="button" class="swot-card-remove" data-text="${escapeHtml(text)}" data-category="${category}" aria-label="Remover">×</button>
  `;

  el.querySelector('.swot-card-remove').addEventListener('click', (e) => {
    removeItemFromCategory(e.target.dataset.text, e.target.dataset.category);
  });

  return el;
}

function movePendingToCategory(index, category) {
  if (isNaN(index) || index < 0 || index >= plan.swot.pendingItems.length) return;

  const text = plan.swot.pendingItems[index];
  const field = categoryFields[category];
  const items = getItemsFromField(field);

  if (items.includes(text)) {
    setSwotFeedback('Essa situação já está nesta categoria.', 'hint');
    return;
  }

  plan.swot.pendingItems.splice(index, 1);
  items.push(text);
  plan.swot[field] = items.join('\n');

  savePlan(plan);
  setSwotFeedback(`"${text}" classificado como ${category}.`, 'success');
  renderSwot();
}

function removeItemFromCategory(text, category) {
  const field = categoryFields[category];
  const items = getItemsFromField(field).filter(item => item !== text);
  plan.swot[field] = items.join('\n');

  savePlan(plan);
  setSwotFeedback('Situação removida. Você pode adicioná-la novamente.', '');
  renderSwot();
}

function getItemsFromField(field) {
  return (plan.swot[field] || '').split('\n').map(s => s.trim()).filter(Boolean);
}

function updateZoneCounts() {
  Object.keys(categoryFields).forEach(category => {
    const field = categoryFields[category];
    const count = getItemsFromField(field).length;
    const el = document.querySelector(`.swot-zone-count[data-category="${category}"]`);
    if (el) {
      el.textContent = `${count} ${count === 1 ? 'situação' : 'situações'}`;
    }
  });
}

function setSwotFeedback(message, state) {
  const feedback = document.getElementById('swot-feedback');
  if (!feedback) return;
  feedback.textContent = message;
  feedback.className = `swot-feedback${state ? ` ${state}` : ''}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
