function renderPillars() {
  const strategies = plan.crossStrategies.map((s, idx) => ({ text: s.strategy, idx }));
  const assigned = new Set();
  Object.values(plan.pillars || {}).forEach(list => list.forEach(text => assigned.add(text)));

  document.querySelectorAll('.pillar .drop-zone').forEach(zone => {
    zone.innerHTML = '';
    const pillar = zone.dataset.pillar;
    const list = (plan.pillars && plan.pillars[pillar]) || [];
    list.forEach(text => {
      zone.appendChild(createDraggable(text, true));
    });
    setupDropZone(zone);
  });

  const pool = document.getElementById('strategies-pool');
  pool.innerHTML = '';
  strategies.forEach(s => {
    if (!assigned.has(s.text)) {
      pool.appendChild(createPoolCard(s.text));
    }
  });
  setupDropZone(pool);
}

function createPoolCard(text) {
  const el = createDraggable(text);

  const mover = document.createElement('div');
  mover.className = 'card-mover';

  const label = document.createElement('label');
  label.textContent = 'Mover para';

  const select = document.createElement('select');
  const poolOption = document.createElement('option');
  poolOption.value = '';
  poolOption.textContent = 'Estratégias disponíveis';
  select.appendChild(poolOption);
  document.querySelectorAll('.pillar .drop-zone').forEach(zone => {
    const opt = document.createElement('option');
    opt.value = zone.dataset.pillar;
    opt.textContent = zone.dataset.pillar;
    select.appendChild(opt);
  });
  select.addEventListener('change', () => {
    if (!select.value) return;
    const zone = document.querySelector(`.pillar .drop-zone[data-pillar="${CSS.escape(select.value)}"]`);
    if (zone) moveStrategy(text, zone);
  });

  mover.appendChild(label);
  mover.appendChild(select);
  el.appendChild(mover);
  return el;
}

function createDraggable(text, removable = false) {
  const el = document.createElement('div');
  el.className = 'card';
  el.draggable = true;
  el.dataset.text = text;

  const span = document.createElement('span');
  span.textContent = text;
  el.appendChild(span);

  const meta = (plan.crossStrategies || []).find(s => s.strategy === text);
  if (meta && meta.pillar) {
    const hint = document.createElement('small');
    hint.className = 'card-pillar-hint';
    hint.textContent = '💡 ' + meta.pillar;
    el.appendChild(hint);
  }

  if (removable) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'card-remove';
    btn.title = 'Devolver para estratégias disponíveis';
    btn.setAttribute('aria-label', 'Devolver para estratégias disponíveis');
    btn.textContent = '×';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      moveStrategy(text, document.getElementById('strategies-pool'));
    });
    el.appendChild(btn);
  }

  el.addEventListener('dragstart', (e) => {
    el.classList.add('dragging');
    e.dataTransfer.setData('text/plain', text);
  });
  el.addEventListener('dragend', () => el.classList.remove('dragging'));
  return el;
}

function setupDropZone(zone) {
  if (zone.dataset.dropSetup) return;
  zone.dataset.dropSetup = 'true';

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const text = e.dataTransfer.getData('text/plain');
    moveStrategy(text, zone);
  });
}

function moveStrategy(text, targetZone) {
  const sourcePillar = Object.keys(plan.pillars || {}).find(p => plan.pillars[p].includes(text));
  if (sourcePillar) {
    plan.pillars[sourcePillar] = plan.pillars[sourcePillar].filter(t => t !== text);
  }

  const targetPillar = targetZone.dataset.pillar;
  if (targetPillar) {
    if (!plan.pillars) plan.pillars = {};
    if (!plan.pillars[targetPillar]) plan.pillars[targetPillar] = [];
    if (!plan.pillars[targetPillar].includes(text)) {
      plan.pillars[targetPillar].push(text);
    }
  }
  savePlan(plan);
  renderPillars();
}
