const defaultCards = [
  { text: 'Reputação alta no marketplace', category: 'Força', explanation: 'É um ponto interno positivo da loja.' },
  { text: 'Dependência de um único fornecedor', category: 'Fraqueza', explanation: 'É um ponto interno que pode prejudicar a loja.' },
  { text: 'Alta do Pix e do social commerce', category: 'Oportunidade', explanation: 'É uma tendência externa que pode beneficiar as vendas.' },
  { text: 'Guerra de preços entre concorrentes', category: 'Ameaça', explanation: 'É um fator externo que pode reduzir margens.' },
  { text: 'Estoque próprio e logística ágil', category: 'Força', explanation: 'É uma vantagem interna operacional.' },
  { text: 'Falta de presença em redes sociais', category: 'Fraqueza', explanation: 'É um ponto interno que a loja pode melhorar.' },
  { text: 'Crescimento do TikTok Shop', category: 'Oportunidade', explanation: 'É um canal externo em expansão que pode impulsionar vendas.' },
  { text: 'Mudanças nas regras do marketplace', category: 'Ameaça', explanation: 'É um fator externo fora do controle da loja.' }
];

const swotColors = {
  Força: '#22c55e',
  Fraqueza: '#f97316',
  Oportunidade: '#3b82f6',
  Ameaça: '#ef4444'
};

function renderSwot() {
  const container = document.getElementById('swot-cards');
  const fields = ['forces', 'weaknesses', 'opportunities', 'threats'];

  if (!plan.swot.cards || plan.swot.cards.length === 0) {
    plan.swot.cards = defaultCards.map(c => ({ ...c, userChoice: null }));
  }

  container.innerHTML = '';
  document.querySelectorAll('.swot-zone-cards').forEach(zone => {
    zone.innerHTML = '';
  });

  let classifiedCount = 0;
  plan.swot.cards.forEach((card, idx) => {
    if (card.userChoice) classifiedCount++;

    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'card swot-card';
    el.draggable = true;
    el.dataset.idx = idx;
    el.setAttribute('aria-pressed', 'false');
    el.innerHTML = `<span>${escapeHtml(card.text)}</span>`;

    el.addEventListener('click', () => selectSwotCard(el));
    el.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('text/plain', String(idx));
      event.dataTransfer.effectAllowed = 'move';
      el.classList.add('dragging');
    });
    el.addEventListener('dragend', () => el.classList.remove('dragging'));

    if (card.userChoice) {
      const zone = document.querySelector(`.swot-zone[data-category="${card.userChoice}"] .swot-zone-cards`);
      if (zone) {
        const numberedCard = createNumberedCard(card, idx);
        zone.appendChild(numberedCard);
      } else {
        container.appendChild(el);
      }
    } else {
      container.appendChild(el);
    }
  });

  updateSwotProgress(classifiedCount);
  updateSwotCounts();

  document.querySelectorAll('.swot-zone').forEach(zone => {
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
      classifySwotCard(Number(event.dataTransfer.getData('text/plain')), zone.dataset.category);
    };
  });

  document.querySelectorAll('.swot-zone-target').forEach(button => {
    button.onclick = () => {
      const selected = document.querySelector('.swot-card.selected');
      if (!selected) {
        setSwotFeedback('Toque em um cartão primeiro e depois escolha a área.', '');
        return;
      }
      classifySwotCard(Number(selected.dataset.idx), button.dataset.category);
    };
  });

  const continueBtn = document.getElementById('swot-continue');
  if (continueBtn) {
    continueBtn.onclick = () => goToStep(2);
  }

  fields.forEach(field => {
    const el = document.getElementById(field);
    if (!el) return;
    el.value = plan.swot[field] || '';
    el.oninput = () => {
      plan.swot[field] = el.value;
      savePlan(plan);
    };
  });
}

function createNumberedCard(card, idx) {
  const color = swotColors[card.userChoice] || '#64748b';
  const el = document.createElement('div');
  el.className = 'swot-numbered-card';
  el.style.borderLeftColor = color;
  el.draggable = true;
  el.dataset.idx = idx;
  el.innerHTML = `
    <span class="swot-card-text">${escapeHtml(card.text)}</span>
    <span class="swot-card-number" style="color:${color}; border-color:${color}">${idx + 1}</span>
  `;
  el.addEventListener('dragstart', (event) => {
    event.dataTransfer.setData('text/plain', String(idx));
    event.dataTransfer.effectAllowed = 'move';
    el.classList.add('dragging');
  });
  el.addEventListener('dragend', () => el.classList.remove('dragging'));
  return el;
}

function selectSwotCard(card) {
  document.querySelectorAll('.swot-card.selected').forEach(selected => {
    selected.classList.remove('selected');
    selected.setAttribute('aria-pressed', 'false');
  });
  card.classList.add('selected');
  card.setAttribute('aria-pressed', 'true');
  setSwotFeedback('Cartão selecionado. Escolha uma área para classificar.', '');
}

function classifySwotCard(idx, category) {
  const card = plan.swot.cards[idx];
  if (!card || !category) return;

  card.userChoice = category;
  savePlan(plan);

  if (card.userChoice === card.category) {
    setSwotFeedback(`Você classificou como ${category}. Essa é uma classificação comum: ${card.explanation}`, 'success');
  } else {
    setSwotFeedback(`Você classificou como ${category}. Uma sugestão é ${card.category}, porque ${card.explanation}. No SWOT da sua loja, sua interpretação também pode fazer sentido.`, 'hint');
  }
  renderSwot();
}

function updateSwotProgress(classifiedCount) {
  const total = plan.swot.cards.length;
  const percent = total ? Math.round((classifiedCount / total) * 100) : 0;

  const label = document.getElementById('swot-progress-label');
  const score = document.getElementById('swot-score');
  const progressBar = document.querySelector('.swot-progress-track');
  const progressFill = document.getElementById('swot-progress-fill');

  if (label) label.textContent = `${classifiedCount} de ${total} situações classificadas`;
  if (score) score.textContent = `${percent}%`;
  if (progressBar) {
    progressBar.setAttribute('aria-valuemax', String(total));
    progressBar.setAttribute('aria-valuenow', String(classifiedCount));
  }
  if (progressFill) progressFill.style.width = `${percent}%`;
}

function updateSwotCounts() {
  const categories = ['Força', 'Fraqueza', 'Oportunidade', 'Ameaça'];
  categories.forEach(cat => {
    const count = plan.swot.cards.filter(c => c.userChoice === cat).length;
    const el = document.querySelector(`.swot-zone-count[data-category="${cat}"]`);
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
