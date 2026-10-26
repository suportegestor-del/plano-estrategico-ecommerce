function renderRoadmap() {
  const zones = document.querySelectorAll('.timeline-zone');
  const assignedIds = new Set();

  zones.forEach(zone => {
    zone.innerHTML = '';
    const term = zone.dataset.term;
    if (term) {
      (plan.initiatives || [])
        .filter(i => plan.roadmap[i.id] === term)
        .forEach(i => {
          assignedIds.add(i.id);
          zone.appendChild(createRoadmapCard(i));
        });
    }
    setupRoadmapDrop(zone);
  });

  const pool = document.getElementById('initiatives-pool');
  pool.innerHTML = '';
  (plan.initiatives || [])
    .filter(i => !assignedIds.has(i.id))
    .forEach(i => pool.appendChild(createRoadmapCard(i)));

  updateLaneAlerts();
}

function createRoadmapCard(initiative) {
  const el = document.createElement('div');
  el.className = 'initiative';
  el.draggable = true;
  el.dataset.id = initiative.id;
  el.innerHTML = `
    <strong>${escapeHtml(initiative.title)}</strong>
    <div><small>${escapeHtml(initiative.owner || 'Sem responsável')} · ${initiative.due || 'Sem prazo'}</small></div>
  `;
  el.addEventListener('dragstart', (e) => {
    el.classList.add('dragging');
    e.dataTransfer.setData('text/plain', initiative.id);
  });
  el.addEventListener('dragend', () => el.classList.remove('dragging'));
  return el;
}

function setupRoadmapDrop(zone) {
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const id = e.dataTransfer.getData('text/plain');
    const term = zone.dataset.term;
    if (term) {
      plan.roadmap[id] = term;
    } else {
      delete plan.roadmap[id];
    }
    savePlan(plan);
    renderRoadmap();
  });
}

function updateLaneAlerts() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const byTerm = { short: [], medium: [], long: [] };
  Object.entries(plan.roadmap || {}).forEach(([id, term]) => {
    if (byTerm[term]) {
      const i = plan.initiatives.find(x => x.id === id);
      if (i) byTerm[term].push(i);
    }
  });

  Object.keys(byTerm).forEach(term => {
    const alertEl = document.getElementById(term + '-alert');
    if (!alertEl) return;
    const items = byTerm[term];
    const messages = [];

    if (term === 'short' && items.length > 5) {
      messages.push('Muitas iniciativas no curto prazo. Considere adiar algumas.');
    }

    const overdue = items.filter(i => i.due && new Date(i.due) < today);
    if (overdue.length > 0) {
      messages.push(`${overdue.length} iniciativa(s) com prazo vencido.`);
    }

    const noOwner = items.filter(i => !i.owner.trim());
    if (noOwner.length > 0) {
      messages.push(`${noOwner.length} iniciativa(s) sem responsável.`);
    }

    alertEl.textContent = messages.join(' ');
  });
}
