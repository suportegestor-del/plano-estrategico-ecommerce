function renderKanban() {
  ensureInitiativesFromGoals();

  document.querySelectorAll('.kanban-zone').forEach(zone => {
    zone.innerHTML = '';
    const status = zone.dataset.status;
    (plan.initiatives || [])
      .filter(i => i.status === status)
      .forEach(i => zone.appendChild(createInitiativeCard(i)));
    setupKanbanDrop(zone);
  });

  document.querySelectorAll('.add-initiative').forEach(btn => {
    btn.onclick = () => addInitiative(btn.dataset.status);
  });

  renderKanbanProgress();
}

function ensureInitiativesFromGoals() {
  if (!plan.initiatives) plan.initiatives = [];
  if (!plan.goals || plan.goals.length === 0) return;

  let created = false;
  plan.goals.forEach(goal => {
    if (!goal.text.trim()) return;
    const exists = plan.initiatives.some(i => i.goalId === goal.id);
    if (exists) return;

    plan.initiatives.push({
      id: 'init-' + Date.now() + '-' + goal.id,
      goalId: goal.id,
      title: '',
      owner: '',
      due: '',
      status: 'unassigned'
    });
    created = true;
  });

  if (created) savePlan(plan);
}



function createInitiativeCard(initiative) {
  const goals = plan.goals || [];
  const linkedGoal = goals.find(g => g.id === initiative.goalId);
  const goalLabel = linkedGoal ? escapeHtml(linkedGoal.text) : 'Sem meta';

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
    <div class="initiative-meta">
      <input type="text" data-field="owner" value="${escapeHtml(initiative.owner)}" placeholder="Responsável">
      <input type="date" data-field="due" value="${initiative.due}" placeholder="Prazo">
    </div>
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
      item.status = zone.dataset.status;
      savePlan(plan);
      renderKanban();
    }
  };
}

function addInitiative(status = 'unassigned') {
  if (!plan.initiatives) plan.initiatives = [];

  const goals = plan.goals || [];
  const nextGoal = goals.find(g => g.text.trim() && !plan.initiatives.some(i => i.goalId === g.id));

  plan.initiatives.push({
    id: 'init-' + Date.now(),
    goalId: nextGoal ? nextGoal.id : '',
    title: '',
    owner: '',
    due: '',
    status
  });
  savePlan(plan);
  renderKanban();
}

function renderKanbanProgress() {
  const existing = document.getElementById('kanban-progress');
  if (existing) existing.remove();

  const board = document.querySelector('.kanban-board');
  if (!board) return;

  const total = plan.initiatives.length;
  const done = plan.initiatives.filter(i => i.status === 'done').length;
  const progress = total ? Math.round((done / total) * 100) : 0;

  const el = document.createElement('div');
  el.id = 'kanban-progress';
  el.className = 'progress-summary';
  el.innerHTML = `<strong>Progresso geral:</strong> ${done} de ${total} iniciativas concluídas (${progress}%).`;
  board.parentElement.insertBefore(el, board);
}
