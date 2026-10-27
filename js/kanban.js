function renderKanban() {
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

function createInitiativeCard(initiative) {
  const goals = plan.goals || [];
  const goalOptions = goals.map(g => `<option value="${g.id}" ${initiative.goalId === g.id ? 'selected' : ''}>${escapeHtml(g.text || g.pillar)}</option>`).join('');

  const el = document.createElement('div');
  el.className = 'initiative';
  el.draggable = true;
  el.dataset.id = initiative.id;
  el.innerHTML = `
    <select data-field="goalId" class="initiative-goal">
      <option value="">Vincular a uma meta...</option>
      ${goalOptions}
    </select>
    <input type="text" data-field="title" value="${escapeHtml(initiative.title)}" placeholder="Nome da iniciativa">
    <div class="initiative-meta">
      <input type="text" data-field="owner" value="${escapeHtml(initiative.owner)}" placeholder="Responsável">
      <input type="date" data-field="due" value="${initiative.due}">
    </div>
    <button class="btn btn-small btn-secondary remove-initiative">Remover</button>
  `;

  el.addEventListener('dragstart', (e) => {
    el.classList.add('dragging');
    e.dataTransfer.setData('text/plain', initiative.id);
  });
  el.addEventListener('dragend', () => el.classList.remove('dragging'));

  el.querySelectorAll('input, select').forEach(input => {
    input.addEventListener('input', () => {
      initiative[input.dataset.field] = input.value;
      savePlan(plan);
      if (input.dataset.field === 'goalId' && input.value) {
        const goal = goals.find(g => g.id === input.value);
        if (goal && !initiative.title.trim()) {
          initiative.title = `Ação para: ${goal.text.substring(0, 40)}${goal.text.length > 40 ? '...' : ''}`;
        }
      }
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
  const firstGoal = plan.goals && plan.goals[0];
  plan.initiatives.push({
    id: 'init-' + Date.now(),
    goalId: firstGoal ? firstGoal.id : '',
    title: firstGoal && firstGoal.text ? `Ação para: ${firstGoal.text.substring(0, 40)}...` : 'Nova iniciativa',
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
