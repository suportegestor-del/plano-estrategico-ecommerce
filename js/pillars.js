function renderPillars() {
  const strategies = plan.crossStrategies.map((s, idx) => ({ text: s.strategy, idx }));
  const assigned = new Set();
  Object.values(plan.pillars || {}).forEach(list => list.forEach(text => assigned.add(text)));

  document.querySelectorAll('.pillar .drop-zone').forEach(zone => {
    zone.innerHTML = '';
    const pillar = zone.dataset.pillar;
    const list = (plan.pillars && plan.pillars[pillar]) || [];
    list.forEach(text => {
      zone.appendChild(createDraggable(text));
    });
    setupDropZone(zone);
  });

  const pool = document.getElementById('strategies-pool');
  pool.innerHTML = '';
  strategies.forEach(s => {
    if (!assigned.has(s.text)) {
      pool.appendChild(createDraggable(s.text));
    }
  });
  setupDropZone(pool);
}

function createDraggable(text) {
  const el = document.createElement('div');
  el.className = 'card';
  el.draggable = true;
  el.textContent = text;
  el.dataset.text = text;
  el.addEventListener('dragstart', (e) => {
    el.classList.add('dragging');
    e.dataTransfer.setData('text/plain', text);
  });
  el.addEventListener('dragend', () => el.classList.remove('dragging'));
  return el;
}

function setupDropZone(zone) {
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
