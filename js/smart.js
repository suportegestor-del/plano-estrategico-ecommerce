function renderSmart() {
  const container = document.getElementById('pillars-goals');
  const pillars = Object.keys(plan.pillars || {});

  if (pillars.length === 0) {
    container.innerHTML = '<p>Defina seus pilares no módulo anterior para criar metas.</p>';
    return;
  }

  ensureGoals(pillars);

  container.innerHTML = '';
  plan.goals.forEach((goal, idx) => {
    const pillarStrategies = (plan.pillars[goal.pillar] || []).map(s => `<li>${escapeHtml(s)}</li>`).join('') || '<li class="empty">Nenhuma estratégia vinculada a este pilar.</li>';

    const card = document.createElement('div');
    card.className = 'goal-card';
    card.dataset.goalIdx = idx;
    card.innerHTML = `
      <div class="goal-pillar-header">
        <label>Pilar: ${escapeHtml(goal.pillar)}</label>
        <button class="btn btn-small btn-secondary toggle-pillar-strategies" data-idx="${idx}" type="button">Ver estratégias</button>
      </div>
      <div class="pillar-strategies" data-strategies="${idx}" style="display:none">
        <strong>Estratégias deste pilar:</strong>
        <ul>${pillarStrategies}</ul>
      </div>
      <input type="text" data-idx="${idx}" class="goal-input" value="${escapeHtml(goal.text)}" placeholder="Ex.: aumentar o faturamento de R$ 20 mil para R$ 30 mil/mês em 6 meses">
      <div class="smart-feedback" data-feedback="${idx}"></div>
      <div class="smart-checks" data-checks="${idx}">
        <div class="smart-check" data-key="specific">Específico</div>
        <div class="smart-check" data-key="measurable">Mensurável</div>
        <div class="smart-check" data-key="achievable">Atingível</div>
        <div class="smart-check" data-key="relevant">Relevante</div>
        <div class="smart-check" data-key="timeBound">Temporal</div>
      </div>
    `;
    container.appendChild(card);
    updateSmartIndicators(idx, goal.text);
  });

  container.querySelectorAll('.toggle-pillar-strategies').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = btn.dataset.idx;
      const box = container.querySelector(`[data-strategies="${idx}"]`);
      if (!box) return;
      const isHidden = box.style.display === 'none';
      box.style.display = isHidden ? 'block' : 'none';
      btn.textContent = isHidden ? 'Ocultar estratégias' : 'Ver estratégias';
    });
  });

  container.querySelectorAll('.goal-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.idx);
      plan.goals[idx].text = e.target.value;
      savePlan(plan);
      updateSmartIndicators(idx, e.target.value);
    });
  });

  document.getElementById('add-goal').onclick = () => {
    plan.goals.push({ id: 'goal-' + Date.now(), text: '', pillar: pillars[0] });
    savePlan(plan);
    renderSmart();
  };
}

function ensureGoals(pillars) {
  if (!plan.goals) plan.goals = [];
  pillars.forEach(pillar => {
    if (!plan.goals.find(g => g.pillar === pillar)) {
      plan.goals.push({ id: 'goal-' + Date.now() + '-' + pillar, text: '', pillar });
    }
  });
}

function updateSmartIndicators(idx, text) {
  const checks = evaluateSmart(text);
  const feedback = buildSmartFeedback(checks);
  const card = document.querySelector(`.goal-card[data-goal-idx="${idx}"]`);
  if (!card) return;

  card.querySelector(`[data-feedback="${idx}"]`).textContent = feedback;

  Object.keys(checks).forEach(key => {
    const el = card.querySelector(`[data-key="${key}"]`);
    if (el) el.classList.toggle('ok', checks[key]);
  });
}

function evaluateSmart(text) {
  const lower = text.toLowerCase();
  return {
    specific: /aumentar|reduzir|melhorar|lançar|criar|implementar/.test(lower),
    measurable: /\d|R\$|pct|por cento|%|mil|milhão/.test(lower),
    achievable: text.length > 15,
    relevant: /venda|faturamento|cliente|estoque|conversão|tráfego/.test(lower),
    timeBound: /em \d|dentro de|\d meses|\d dias|prazo/.test(lower)
  };
}

function buildSmartFeedback(checks) {
  const tips = [];
  if (!checks.specific) tips.push('Use um verbo de ação claro, como aumentar, reduzir ou lançar.');
  if (!checks.measurable) tips.push('Inclua um número ou indicador para medir o resultado.');
  if (!checks.achievable) tips.push('Escreva uma meta concreta e realista.');
  if (!checks.relevant) tips.push('Relacione a meta a vendas, clientes, estoque ou outro pilar do negócio.');
  if (!checks.timeBound) tips.push('Defina um prazo, como "em 3 meses".');
  if (tips.length === 0) return 'Ótima! Sua meta atende todos os critérios SMART.';
  return 'Dica: ' + tips.join(' ');
}
