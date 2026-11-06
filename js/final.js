function renderFinal() {
  const container = document.getElementById('final-result');
  if (!container) return;

  const goals = (plan.goals || []).filter(g => (g.text || '').trim());
  const initiatives = plan.initiatives || [];
  const crossStrategies = plan.crossStrategies || [];
  const pillars = plan.pillars || {};
  const roadmap = plan.roadmap || {};

  const done = initiatives.filter(i => i.status === 'done').length;
  const progress = initiatives.length ? Math.round((done / initiatives.length) * 100) : 0;
  const mapped = initiatives.filter(i => roadmap[i.id]).length;

  const dateStr = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  container.innerHTML = `
    <div class="final-cover">
      <span class="final-eyebrow">Resultado final</span>
      <h2>Plano Estratégico${plan.storeName ? ' — ' + escapeHtml(plan.storeName) : ''}</h2>
      <p>Gerado em ${dateStr}</p>
      <div class="final-stats">
        <div class="final-stat"><strong>${crossStrategies.length}</strong><span>Estratégias</span></div>
        <div class="final-stat"><strong>${goals.length}</strong><span>Metas</span></div>
        <div class="final-stat"><strong>${initiatives.length}</strong><span>Iniciativas</span></div>
        <div class="final-stat"><strong>${progress}%</strong><span>Concluído</span></div>
        <div class="final-stat"><strong>${mapped}</strong><span>No roadmap</span></div>
      </div>
      <div class="kb-bar final-bar"><div class="kb-bar-fill" style="width: ${progress}%"></div></div>
    </div>

    <section class="final-section">
      <h3>1. Diagnóstico SWOT</h3>
      <div class="final-swot-grid"></div>
    </section>

    <section class="final-section">
      <h3>2. Estratégias Cruzadas</h3>
      <div class="final-cross"></div>
    </section>

    <section class="final-section">
      <h3>3. Pilares Estratégicos</h3>
      <div class="final-pillars"></div>
    </section>

    <section class="final-section">
      <h3>4. Metas SMART</h3>
      <div class="final-goals"></div>
    </section>

    <section class="final-section">
      <h3>5. Iniciativas e Entregas</h3>
      <div class="final-initiatives"></div>
    </section>

    <section class="final-section">
      <h3>6. Roadmap Cronológico</h3>
      <div class="final-roadmap"></div>
    </section>
  `;

  renderFinalSwot(container.querySelector('.final-swot-grid'));
  renderFinalCross(container.querySelector('.final-cross'), crossStrategies);
  renderFinalPillars(container.querySelector('.final-pillars'), pillars);
  renderFinalGoals(container.querySelector('.final-goals'), goals);
  renderFinalInitiatives(container.querySelector('.final-initiatives'), initiatives);
  renderFinalRoadmap(container.querySelector('.final-roadmap'), initiatives, roadmap, goals);

  const printBtn = document.getElementById('print-final');
  if (printBtn) printBtn.onclick = () => window.print();
}

function renderFinalSwot(wrap) {
  const groups = [
    { label: 'Forças', field: 'forces', cls: 'swot-forces' },
    { label: 'Fraquezas', field: 'weaknesses', cls: 'swot-weaknesses' },
    { label: 'Oportunidades', field: 'opportunities', cls: 'swot-opportunities' },
    { label: 'Ameaças', field: 'threats', cls: 'swot-threats' }
  ];
  groups.forEach(g => {
    const items = (plan.swot[g.field] || '').split('\n').map(s => s.trim()).filter(Boolean);
    const box = document.createElement('div');
    box.className = `final-swot-box ${g.cls}`;
    box.innerHTML = `<h4>${g.label}</h4>` +
      (items.length
        ? `<ul>${items.map(i => {
            const code = getSwotCode(i);
            return `<li>${code ? `<strong class="final-swot-code">${code}</strong> ` : ''}${escapeHtml(i)}</li>`;
          }).join('')}</ul>`
        : '<p class="final-empty">Não preenchido</p>');
    wrap.appendChild(box);
  });
}

function renderFinalCross(wrap, strategies) {
  if (strategies.length === 0) {
    wrap.innerHTML = '<p class="final-empty">Nenhuma estratégia definida.</p>';
    return;
  }
  strategies.forEach(s => {
    const card = document.createElement('div');
    card.className = 'final-cross-card';
    card.innerHTML = `
      <span class="final-cross-type">${escapeHtml(s.type)}</span>
      <p class="final-cross-items"><strong>${escapeHtml(crossComboLabel(s))}</strong></p>
      <p class="final-cross-items-detail">${escapeHtml(crossItemsDetail(s))}</p>
      ${s.pillar ? `<p class="final-cross-pillar">💡 Pilar sugerido: ${escapeHtml(s.pillar)}</p>` : ''}
      <p class="final-cross-text">${escapeHtml(s.strategy)}</p>
    `;
    wrap.appendChild(card);
  });
}

function renderFinalPillars(wrap, pillars) {
  const names = Object.keys(pillars);
  if (names.length === 0) {
    wrap.innerHTML = '<p class="final-empty">Nenhum pilar definido.</p>';
    return;
  }
  const ordered = [
    ...PILLAR_ORDER.filter(p => names.includes(p)),
    ...names.filter(n => !PILLAR_ORDER.includes(n))
  ];
  let foundationHeaderShown = false;
  ordered.forEach(name => {
    if (PILLAR_ORDER.indexOf(name) >= 4 && !foundationHeaderShown) {
      foundationHeaderShown = true;
      const foundationTitle = document.createElement('h4');
      foundationTitle.className = 'final-foundation-title';
      foundationTitle.textContent = 'Fundação';
      wrap.appendChild(foundationTitle);
    }
    const strategies = pillars[name] || [];
    const box = document.createElement('div');
    box.className = 'final-pillar-box' + (PILLAR_ORDER.indexOf(name) >= 4 ? ' final-pillar-foundation' : '');
    box.innerHTML = `<h4>${escapeHtml(name)}</h4>` +
      (strategies.length
        ? `<ul>${strategies.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>`
        : '<p class="final-empty">Sem estratégias vinculadas.</p>');
    wrap.appendChild(box);
  });
}

function renderFinalGoals(wrap, goals) {
  if (goals.length === 0) {
    wrap.innerHTML = '<p class="final-empty">Nenhuma meta definida.</p>';
    return;
  }
  goals.forEach(g => {
    const info = [];
    if (g.deadline) info.push(`<span>Prazo: ${formatDateBR(g.deadline)}</span>`);
    if (g.responsible) info.push(`<span>Responsável: ${escapeHtml(g.responsible)}</span>`);
    if (g.indicator) info.push(`<span>Indicador: ${escapeHtml(g.indicator)}</span>`);
    const card = document.createElement('div');
    card.className = 'final-goal-card';
    card.innerHTML = `
      <span class="final-goal-pillar">${escapeHtml(g.pillar || '')}</span>
      <h4>${escapeHtml(g.title || g.text)}</h4>
      ${g.description ? `<p>${escapeHtml(g.description)}</p>` : ''}
      ${info.length ? `<div class="final-goal-info">${info.join('')}</div>` : ''}
    `;
    wrap.appendChild(card);
  });
}

const FINAL_STATUS = {
  unassigned: { label: 'Sem status', cls: 'status-unassigned' },
  todo: { label: 'A fazer', cls: 'status-todo' },
  doing: { label: 'Em andamento', cls: 'status-doing' },
  done: { label: 'Concluído', cls: 'status-done' }
};

function renderFinalInitiatives(wrap, initiatives) {
  if (initiatives.length === 0) {
    wrap.innerHTML = '<p class="final-empty">Nenhuma iniciativa definida.</p>';
    return;
  }
  initiatives.forEach(i => {
    const status = FINAL_STATUS[i.status] || FINAL_STATUS.unassigned;
    const goal = (plan.goals || []).find(g => g.id === i.goalId);
    const row = document.createElement('div');
    row.className = 'final-init-row';
    row.innerHTML = `
      <span class="final-status ${status.cls}">${status.label}</span>
      <div class="final-init-body">
        <strong>${escapeHtml(i.title || (goal ? goal.title : 'Sem título'))}</strong>
        <small>${escapeHtml(i.owner || 'Sem responsável')}${i.due ? ' · ' + formatDateBR(i.due) : ''}</small>
      </div>
    `;
    wrap.appendChild(row);
  });
}

const FINAL_TERMS = [
  { term: '', label: 'Sem prazo', sub: 'Aguardando definição', cls: 'lane-none' },
  { term: 'short', label: 'Curto prazo', sub: 'Próximos 3 meses', cls: 'lane-short' },
  { term: 'medium', label: 'Médio prazo', sub: 'De 3 a 12 meses', cls: 'lane-medium' },
  { term: 'long', label: 'Longo prazo', sub: 'Mais de 12 meses', cls: 'lane-long' }
];

function renderFinalRoadmap(wrap, initiatives, roadmap, goals) {
  FINAL_TERMS.forEach(t => {
    const items = t.term
      ? initiatives.filter(i => roadmap[i.id] === t.term)
      : initiatives.filter(i => !roadmap[i.id]);

    const lane = document.createElement('div');
    lane.className = `timeline-lane ${t.cls} final-lane`;
    lane.innerHTML = `<h4><span class="lane-dot"></span>${t.label}</h4><p class="lane-sub">${t.sub}</p>`;

    const zone = document.createElement('div');
    zone.className = 'final-lane-items';
    if (items.length === 0) {
      zone.innerHTML = '<p class="final-empty">Vazio</p>';
    } else {
      items.forEach(i => {
        const goal = goals.find(g => g.id === i.goalId);
        const card = document.createElement('div');
        card.className = 'initiative';
        card.innerHTML = `
          <strong>${escapeHtml((goal && goal.title) || i.title || 'Sem título')}</strong>
          <small>${escapeHtml(i.owner || 'Sem responsável')} · ${i.due ? formatDateBR(i.due) : 'Sem prazo'}</small>
        `;
        zone.appendChild(card);
      });
    }
    lane.appendChild(zone);
    wrap.appendChild(lane);
  });
}
