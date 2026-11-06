function autoClassifyByDue() {
  if (!plan.initiatives) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in3Months = new Date(today);
  in3Months.setMonth(in3Months.getMonth() + 3);
  const in12Months = new Date(today);
  in12Months.setMonth(in12Months.getMonth() + 12);

  let changed = false;
  plan.initiatives.forEach(i => {
    if (plan.roadmap[i.id] || !i.due) return;
    const due = new Date(i.due);
    if (isNaN(due)) return;
    plan.roadmap[i.id] = due <= in3Months ? 'short' : due <= in12Months ? 'medium' : 'long';
    changed = true;
  });
  return changed;
}

function renderRoadmap() {
  if (autoClassifyByDue()) savePlan(plan);

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
  const linkedGoal = (plan.goals || []).find(g => g.id === initiative.goalId);
  const title = (linkedGoal && linkedGoal.title) || initiative.title || 'Sem título';
  const description = (linkedGoal && linkedGoal.description) || '';
  const currentTerm = plan.roadmap[initiative.id] || '';
  const el = document.createElement('div');
  el.className = 'initiative';
  el.draggable = true;
  el.dataset.id = initiative.id;
  el.innerHTML = `
    <strong>${escapeHtml(title)}</strong>
    ${description ? `<div class="initiative-desc">${escapeHtml(description)}</div>` : ''}
    <small>${escapeHtml(initiative.owner || 'Sem responsável')} · ${initiative.due || 'Sem prazo'}</small>
    <div class="roadmap-move">
      <label>Mover para</label>
      <select>
        <option value="" ${currentTerm === '' ? 'selected' : ''}>Iniciativas sem prazo</option>
        <option value="short" ${currentTerm === 'short' ? 'selected' : ''}>Curto prazo</option>
        <option value="medium" ${currentTerm === 'medium' ? 'selected' : ''}>Médio prazo</option>
        <option value="long" ${currentTerm === 'long' ? 'selected' : ''}>Longo prazo</option>
      </select>
    </div>
  `;
  el.querySelector('select').addEventListener('change', (e) => {
    const term = e.target.value;
    if (term) {
      plan.roadmap[initiative.id] = term;
    } else {
      delete plan.roadmap[initiative.id];
    }
    savePlan(plan);
    renderRoadmap();
  });
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
