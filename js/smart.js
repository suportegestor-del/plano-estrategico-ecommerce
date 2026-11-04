const SMART_PILLAR_ORDER = ['Operação', 'Crescimento', 'Inovação', 'Experiência do Cliente'];

function getSmartPillars() {
  const pillars = SMART_PILLAR_ORDER.filter(p => (plan.pillars || {})[p]);
  Object.keys(plan.pillars || {}).forEach(p => {
    if (!pillars.includes(p)) pillars.push(p);
  });
  return pillars;
}

function pillarNumber(pillar, position) {
  const idx = SMART_PILLAR_ORDER.indexOf(pillar);
  const n = idx >= 0 ? idx + 1 : position + 1;
  return String(n).padStart(2, '0');
}

// Mantém goal.text sincronizado (usado por Kanban, PDF e Excel)
function syncGoalText(goal) {
  const title = (goal.title || '').trim().replace(/\.+$/, '');
  const description = (goal.description || '').trim();
  goal.text = [title, description].filter(Boolean).join('. ');
}

// Migra metas antigas que só tinham o campo text
function normalizeGoal(goal) {
  if (!goal.title && goal.text) {
    const parts = goal.text.split(/(?<=[.!?])\s+/);
    goal.title = parts[0].trim();
    goal.description = parts.slice(1).join(' ').trim() || goal.text.trim();
  }
  syncGoalText(goal);
}

function formatDateBR(value) {
  if (!value) return '';
  const [y, m, d] = value.split('-');
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

function renderSmart() {
  const container = document.getElementById('pillars-goals');
  const pillars = getSmartPillars();

  if (!plan.goals) plan.goals = [];
  plan.goals.forEach(normalizeGoal);
  const before = plan.goals.length;
  plan.goals = plan.goals.filter(g => g.text.trim());
  if (plan.goals.length !== before) savePlan(plan);

  const pillarSelect = document.getElementById('goal-pillar');
  if (pillarSelect) {
    pillarSelect.innerHTML = pillars.length
      ? pillars.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('')
      : '<option value="">Defina os pilares no módulo anterior</option>';
  }

  if (pillars.length === 0) {
    container.className = '';
    container.innerHTML = '<p>Defina seus pilares no módulo anterior para criar metas.</p>';
    return;
  }

  container.className = 'smart-board';
  container.innerHTML = '';
  pillars.forEach((pillar, pIdx) => {
    const pillarGoals = plan.goals
      .map((g, idx) => ({ goal: g, idx }))
      .filter(x => x.goal.pillar === pillar);

    const card = document.createElement('article');
    card.className = 'smart-pillar';
    card.dataset.pillar = pillar;

    const strategies = (plan.pillars[pillar] || []);
    const strategiesHtml = strategies.length
      ? strategies.map(s => `<li>${escapeHtml(s)}</li>`).join('')
      : '<li class="empty">Nenhuma estratégia vinculada a este pilar.</li>';

    card.innerHTML = `
      <div class="pilar-cabecalho">
        <h4><span class="pillar-number">${pillarNumber(pillar, pIdx)}</span> ${escapeHtml(pillar)}</h4>
        <span class="contador">${pillarGoals.length} ${pillarGoals.length === 1 ? 'meta' : 'metas'}</span>
      </div>
      <div class="smart-pillar-goals"></div>
      <button type="button" class="pillar-view-strategies">Ver estratégias</button>
      <div class="pillar-strategies" style="display:none">
        <strong>Estratégias deste pilar:</strong>
        <ul>${strategiesHtml}</ul>
      </div>
    `;

    const goalsWrap = card.querySelector('.smart-pillar-goals');
    if (pillarGoals.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'meta-empty';
      empty.textContent = 'Nenhuma meta criada para este pilar.';
      goalsWrap.appendChild(empty);
    } else {
      pillarGoals.forEach(({ goal, idx }) => {
        goalsWrap.appendChild(createMetaCard(goal, idx));
      });
    }

    const strategiesBtn = card.querySelector('.pillar-view-strategies');
    const strategiesBox = card.querySelector('.pillar-strategies');
    strategiesBtn.addEventListener('click', () => {
      const isHidden = strategiesBox.style.display === 'none';
      strategiesBox.style.display = isHidden ? 'block' : 'none';
      strategiesBtn.textContent = isHidden ? 'Ocultar estratégias' : 'Ver estratégias';
    });

    container.appendChild(card);
  });

  const form = document.getElementById('goal-form');
  if (form) {
    form.onsubmit = (e) => {
      e.preventDefault();
      const title = document.getElementById('goal-title').value.trim();
      const pillar = document.getElementById('goal-pillar').value;
      if (!title || !pillar) return;
      const goal = {
        id: 'goal-' + Date.now(),
        pillar,
        title,
        description: document.getElementById('goal-description').value.trim(),
        deadline: document.getElementById('goal-deadline').value,
        responsible: document.getElementById('goal-responsible').value.trim(),
        indicator: document.getElementById('goal-indicator').value.trim()
      };
      syncGoalText(goal);
      plan.goals.push(goal);
      savePlan(plan);
      form.reset();
      renderSmart();
    };
  }

  const aiBtn = document.getElementById('generate-smart-ai');
  if (aiBtn) {
    aiBtn.onclick = () => generateSmartWithAI();
  }

  setupGoalModal();
}

function createMetaCard(goal, idx) {
  const card = document.createElement('div');
  card.className = 'meta';

  const info = [];
  if (goal.deadline) info.push(`<span>Prazo: ${formatDateBR(goal.deadline)}</span>`);
  if (goal.responsible) info.push(`<span>Responsável: ${escapeHtml(goal.responsible)}</span>`);
  if (goal.indicator) info.push(`<span>Indicador: ${escapeHtml(goal.indicator)}</span>`);

  card.innerHTML = `
    <h4 class="meta-title">${escapeHtml(goal.title || goal.text)}</h4>
    ${goal.description ? `<p class="meta-desc">${escapeHtml(goal.description)}</p>` : ''}
    ${info.length ? `<div class="meta-informacoes">${info.join('')}</div>` : ''}
    <div class="meta-acoes">
      <button type="button" class="meta-btn view-meta">Visualizar</button>
      <button type="button" class="meta-btn edit-meta">Editar</button>
      <button type="button" class="meta-btn delete-meta">Excluir</button>
    </div>
  `;

  card.querySelector('.view-meta').addEventListener('click', () => openGoalModal(idx, 'view'));
  card.querySelector('.edit-meta').addEventListener('click', () => openGoalModal(idx, 'edit'));
  card.querySelector('.delete-meta').addEventListener('click', () => {
    plan.goals.splice(idx, 1);
    savePlan(plan);
    renderSmart();
  });

  return card;
}

function openGoalModal(idx, mode) {
  const goal = plan.goals[idx];
  const modal = document.getElementById('goal-modal');
  if (!goal || !modal) return;
  goalModalIdx = idx;

  const pillars = getSmartPillars();
  const pillarSelect = document.getElementById('gm-pillar');
  pillarSelect.innerHTML = pillars
    .map(p => `<option value="${escapeHtml(p)}"${p === goal.pillar ? ' selected' : ''}>${escapeHtml(p)}</option>`)
    .join('');

  document.getElementById('goal-modal-heading').textContent = mode === 'view' ? 'Visualizar meta' : 'Editar meta';
  document.getElementById('gm-title').value = goal.title || '';
  document.getElementById('gm-description').value = goal.description || '';
  document.getElementById('gm-deadline').value = goal.deadline || '';
  document.getElementById('gm-responsible').value = goal.responsible || '';
  document.getElementById('gm-indicator').value = goal.indicator || '';

  const readonly = mode === 'view';
  ['gm-title', 'gm-description', 'gm-pillar', 'gm-deadline', 'gm-responsible', 'gm-indicator'].forEach(id => {
    document.getElementById(id).disabled = readonly;
  });
  document.getElementById('goal-modal-save').style.display = readonly ? 'none' : '';

  modal.classList.add('active');
}

let goalModalIdx = null;

function closeGoalModal() {
  const modal = document.getElementById('goal-modal');
  if (modal) modal.classList.remove('active');
  goalModalIdx = null;
}

function setupGoalModal() {
  if (setupGoalModal.done) return;
  const modal = document.getElementById('goal-modal');
  if (!modal) return;
  setupGoalModal.done = true;

  document.getElementById('goal-modal-cancel').addEventListener('click', closeGoalModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeGoalModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeGoalModal();
  });
  document.getElementById('goal-modal-save').addEventListener('click', () => {
    if (goalModalIdx === null) return;
    const goal = plan.goals[goalModalIdx];
    if (!goal) return;
    goal.title = document.getElementById('gm-title').value.trim();
    goal.description = document.getElementById('gm-description').value.trim();
    goal.pillar = document.getElementById('gm-pillar').value;
    goal.deadline = document.getElementById('gm-deadline').value;
    goal.responsible = document.getElementById('gm-responsible').value.trim();
    goal.indicator = document.getElementById('gm-indicator').value.trim();
    syncGoalText(goal);
    savePlan(plan);
    closeGoalModal();
    renderSmart();
  });
}

function buildSmartPrompt() {
  const pillars = getSmartPillars();

  let prompt = `Você é um consultor sênior de planejamento estratégico para e-commerce.\n\n`;
  prompt += `Com base nas estratégias de cada pilar abaixo, crie UMA meta SMART para cada pilar.\n`;
  prompt += `A meta deve ser específica, mensurável, atingível, relevante e temporal.\n`;
  prompt += `Use valores realistas para um e-commerce de pequeno/médio porte.\n\n`;

  pillars.forEach(pillar => {
    const strategies = plan.pillars[pillar] || [];
    prompt += `PILAR: ${pillar}\n`;
    prompt += `Estratégias:\n`;
    if (strategies.length === 0) {
      prompt += `- Nenhuma estratégia definida\n`;
    } else {
      strategies.forEach(s => prompt += `- ${s}\n`);
    }
    prompt += `\n`;
  });

  prompt += `Responda APENAS com um objeto JSON válido no formato abaixo, sem explicações, sem markdown, sem texto fora do JSON. No campo "prazo" use o formato AAAA-MM-DD:\n`;
  prompt += `{\n`;
  pillars.forEach((pillar, idx) => {
    prompt += `  "${pillar}": { "titulo": "Título curto da meta", "descricao": "Descrição do resultado esperado", "prazo": "AAAA-MM-DD", "responsavel": "Responsável sugerido", "indicador": "Indicador de acompanhamento" },\n`;
  });
  prompt = prompt.replace(/,\n$/, '\n');
  prompt += `}`;

  return prompt;
}

function parseSmartResponse(text) {
  let cleaned = text.trim();

  const jsonBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    cleaned = jsonBlockMatch[1].trim();
  }

  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    return null;
  }
}

async function generateSmartWithAI() {
  const pillars = getSmartPillars();
  const apiKey = typeof getApiKey === 'function' ? getApiKey() : '';

  if (!apiKey) {
    alert('Chave da OpenAI não configurada. Contate o administrador.');
    return;
  }

  if (pillars.length === 0) {
    alert('Defina seus pilares no módulo anterior antes de gerar metas.');
    return;
  }

  const aiBtn = document.getElementById('generate-smart-ai');
  const originalText = aiBtn ? aiBtn.textContent : '';
  if (aiBtn) {
    aiBtn.disabled = true;
    aiBtn.textContent = 'Gerando...';
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Você é um assistente especializado em planejamento estratégico. Responda apenas em JSON válido.' },
          { role: 'user', content: buildSmartPrompt() }
        ],
        temperature: 0.7,
        max_tokens: 1200
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Erro ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Resposta vazia da IA.');
    }

    const goals = parseSmartResponse(content);

    if (!goals || typeof goals !== 'object') {
      throw new Error('A IA não retornou o formato esperado.');
    }

    pillars.forEach(pillar => {
      const data = goals[pillar];
      if (!data || typeof data !== 'object') return;
      const goal = {
        id: 'goal-' + Date.now() + '-' + pillar,
        pillar,
        title: typeof data.titulo === 'string' ? data.titulo.trim() : '',
        description: typeof data.descricao === 'string' ? data.descricao.trim() : '',
        deadline: typeof data.prazo === 'string' ? data.prazo.trim() : '',
        responsible: typeof data.responsavel === 'string' ? data.responsavel.trim() : '',
        indicator: typeof data.indicador === 'string' ? data.indicador.trim() : ''
      };
      if (!goal.title && !goal.description) return;
      syncGoalText(goal);
      plan.goals.push(goal);
    });

    savePlan(plan);
    renderSmart();
  } catch (err) {
    alert('Erro ao gerar metas: ' + err.message);
    console.error(err);
  } finally {
    if (aiBtn) {
      aiBtn.disabled = false;
      aiBtn.textContent = originalText;
    }
  }
}
