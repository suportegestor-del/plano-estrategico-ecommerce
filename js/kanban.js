function renderKanban() {
  ensureInitiativesFromGoals();
  renderGoalPanel();

  document.querySelectorAll('.kanban-board .kanban-zone').forEach(zone => {
    zone.innerHTML = '';
    const status = zone.dataset.status;
    (plan.initiatives || [])
      .filter(i => boardStatus(i.status) === status)
      .forEach(i => zone.appendChild(createInitiativeCard(i)));
    setupKanbanDrop(zone);
  });

  renderKanbanProgress();
}

function boardStatus(status) {
  return ['todo', 'doing', 'done'].includes(status) ? status : 'todo';
}

function ensureInitiativesFromGoals() {
  if (!plan.initiatives) plan.initiatives = [];
  if (!plan.goals) plan.goals = [];
  if (!plan.roadmap) plan.roadmap = {};

  // Remove iniciativas órfãs: vinculadas a meta que não existe mais
  const validGoalIds = new Set(plan.goals.map(g => g.id));
  const before = plan.initiatives.length;
  plan.initiatives = plan.initiatives.filter(i => {
    if (!i.goalId) return true; // iniciativa manual sem meta, mantém
    if (validGoalIds.has(i.goalId)) return true;
    delete plan.roadmap[i.id];
    return false;
  });
  if (plan.initiatives.length !== before) savePlan(plan);
}

function renderGoalPanel() {
  const container = document.getElementById('goals-initiatives-panel');
  if (!container) return;
  container.innerHTML = '';

  const goals = (plan.goals || []).filter(g => (g.text || '').trim());
  const pending = (goalId) => (plan.initiatives || [])
    .filter(i => i.goalId === goalId && !['todo', 'doing', 'done'].includes(i.status));

  if (goals.length === 0) {
    container.innerHTML = '<p class="kanban-goals-empty">Defina suas metas SMART no passo 4 para criar iniciativas vinculadas a elas aqui.</p>';
    return;
  }

  goals.forEach(goal => {
    const card = document.createElement('div');
    card.className = 'goal-initiative-card';

    const header = document.createElement('div');
    header.className = 'goal-initiative-header';
    const meta = [];
    if (goal.deadline) meta.push(`Prazo: ${formatDateBR(goal.deadline)}`);
    if (goal.responsible) meta.push(`Resp.: ${escapeHtml(goal.responsible)}`);
    header.innerHTML = `
      <div class="goal-initiative-info">
        <strong>${escapeHtml(goal.title || goal.text)}</strong>
        ${meta.length ? `<small>${meta.join(' · ')}</small>` : ''}
      </div>
      <button type="button" class="btn btn-small add-initiative" data-goal="${goal.id}">+ iniciativa</button>
    `;
    card.appendChild(header);

    const zone = document.createElement('div');
    zone.className = 'kanban-zone goal-initiative-zone';
    zone.dataset.status = 'unassigned';
    zone.dataset.goal = goal.id;
    pending(goal.id).forEach(i => zone.appendChild(createInitiativeCard(i)));
    card.appendChild(zone);
    setupKanbanDrop(zone);

    container.appendChild(card);
  });

  // Iniciativas antigas sem meta: mostra para permitir vincular
  const orphans = (plan.initiatives || []).filter(i => !i.goalId || !goals.some(g => g.id === i.goalId));
  const visibleOrphans = orphans.filter(i => !['todo', 'doing', 'done'].includes(i.status));
  if (visibleOrphans.length > 0) {
    const card = document.createElement('div');
    card.className = 'goal-initiative-card goal-orphans';
    card.innerHTML = `
      <div class="goal-initiative-header">
        <div class="goal-initiative-info">
          <strong>Iniciativas sem meta</strong>
          <small>Vincule cada uma a uma meta SMART usando o menu do cartão.</small>
        </div>
      </div>
    `;
    const zone = document.createElement('div');
    zone.className = 'kanban-zone goal-initiative-zone';
    zone.dataset.status = 'unassigned';
    visibleOrphans.forEach(i => zone.appendChild(createInitiativeCard(i)));
    card.appendChild(zone);
    setupKanbanDrop(zone);
    container.appendChild(card);
  }

  container.querySelectorAll('.add-initiative').forEach(btn => {
    btn.onclick = () => addInitiative(btn.dataset.goal);
  });
}



function createInitiativeCard(initiative) {
  const goals = plan.goals || [];
  const linkedGoal = goals.find(g => g.id === initiative.goalId);
  const goalLabel = linkedGoal ? escapeHtml(linkedGoal.title || linkedGoal.text) : 'Sem meta';

  let goalMover = '';
  if (!linkedGoal && goals.length > 0) {
    const options = goals
      .filter(g => (g.text || '').trim())
      .map(g => `<option value="${g.id}">${escapeHtml(g.title || g.text)}</option>`)
      .join('');
    goalMover = `
      <div class="initiative-goal-mover">
        <label>Vincular à meta</label>
        <select data-field="goalId">
          <option value="">Selecione...</option>
          ${options}
        </select>
      </div>
    `;
  }

  const el = document.createElement('div');
  el.className = 'initiative';
  el.draggable = true;
  el.dataset.id = initiative.id;
  el.innerHTML = `
    <div class="initiative-header">
      <span class="drag-handle" title="Arrastar" aria-hidden="true">⋮⋮</span>
      <span class="initiative-goal">${goalLabel}</span>
      <button type="button" class="remove-initiative" title="Remover" aria-label="Remover">×</button>
    </div>
    <div class="initiative-title-row">
      <input type="text" data-field="title" value="${escapeHtml(initiative.title || '')}" placeholder="Título da iniciativa">
    </div>
    <div class="initiative-meta">
      <input type="text" data-field="owner" value="${escapeHtml(initiative.owner || '')}" placeholder="Responsável">
      <input type="date" data-field="due" value="${initiative.due || ''}" placeholder="Prazo">
    </div>
    ${goalMover}
  `;

  el.addEventListener('dragstart', (e) => {
    el.classList.add('dragging');
    e.dataTransfer.setData('text/plain', initiative.id);
  });
  el.addEventListener('dragend', () => el.classList.remove('dragging'));

  el.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', () => {
      initiative[input.dataset.field] = input.value;
      savePlan(plan);
    });
  });

  const goalSelect = el.querySelector('select[data-field="goalId"]');
  if (goalSelect) {
    goalSelect.addEventListener('change', () => {
      initiative.goalId = goalSelect.value;
      savePlan(plan);
      renderKanban();
    });
  }

  el.querySelector('.remove-initiative').addEventListener('click', () => {
    plan.initiatives = plan.initiatives.filter(i => i.id !== initiative.id);
    delete plan.roadmap[initiative.id];
    savePlan(plan);
    renderKanban();
  });

  return el;
}

function setupKanbanDrop(zone) {
  zone.ondragover = (e) => {
    e.preventDefault();
    zone.classList.add('drag-over');
  };
  zone.ondragleave = () => zone.classList.remove('drag-over');
  zone.ondrop = (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const id = e.dataTransfer.getData('text/plain');
    const item = plan.initiatives.find(i => i.id === id);
    if (item) {
      if (zone.dataset.goal) item.goalId = zone.dataset.goal;
      item.status = zone.dataset.status || 'unassigned';
      savePlan(plan);
      renderKanban();
    }
  };
}

function addInitiative(goalId) {
  if (!plan.initiatives) plan.initiatives = [];

  plan.initiatives.push({
    id: 'init-' + Date.now(),
    goalId: goalId || '',
    title: '',
    owner: '',
    due: '',
    status: 'unassigned'
  });
  savePlan(plan);
  renderKanban();
}

function renderKanbanProgress() {
  const slot = document.getElementById('kanban-progress');
  if (!slot) return;

  const total = plan.initiatives.length;
  const done = plan.initiatives.filter(i => i.status === 'done').length;
  const progress = total ? Math.round((done / total) * 100) : 0;

  slot.innerHTML = `
    <p class="kanban-progress-texto"><strong>${done} de ${total}</strong> iniciativas concluídas (${progress}%).</p>
    <div class="kb-bar"><div class="kb-bar-fill" style="width: ${progress}%"></div></div>
  `;
}
