function getApiKey() {
  return (typeof OPENAI_API_KEY !== 'undefined' && OPENAI_API_KEY !== '__OPENAI_API_KEY__')
    ? OPENAI_API_KEY
    : '';
}

function getSwotItems() {
  const parse = (text) => (text || '').split('\n').map(s => s.trim()).filter(Boolean);
  return {
    forces: parse(plan.swot.forces),
    weaknesses: parse(plan.swot.weaknesses),
    opportunities: parse(plan.swot.opportunities),
    threats: parse(plan.swot.threats)
  };
}

function getCombinations() {
  const items = getSwotItems();
  const combos = [
    { type: 'FO', aLabel: 'Força', bLabel: 'Oportunidade', a: items.forces[0] || '', b: items.opportunities[0] || '' },
    { type: 'FA', aLabel: 'Força', bLabel: 'Ameaça', a: items.forces[1] || items.forces[0] || '', b: items.threats[0] || '' },
    { type: 'WO', aLabel: 'Fraqueza', bLabel: 'Oportunidade', a: items.weaknesses[0] || '', b: items.opportunities[1] || items.opportunities[0] || '' },
    { type: 'WT', aLabel: 'Fraqueza', bLabel: 'Ameaça', a: items.weaknesses[1] || items.weaknesses[0] || '', b: items.threats[1] || items.threats[0] || '' }
  ];
  return combos.filter(c => c.a && c.b);
}

function getTypeExplanation(type) {
  const map = {
    FO: 'Como usar essa força para aproveitar a oportunidade?',
    FA: 'Como usar essa força para se proteger dessa ameaça?',
    WO: 'Como resolver essa fraqueza para não perder a oportunidade?',
    WT: 'Como se defender dessa ameaça sem depender desse ponto fraco?'
  };
  return map[type] || 'Como conectar esses dois itens?';
}

function renderSwotCross() {
  const grid = document.getElementById('cross-grid');
  const list = document.getElementById('strategies-list');
  const feedback = document.getElementById('cross-feedback');

  if (!plan.crossStrategies) plan.crossStrategies = [];

  const combos = getCombinations();

  if (combos.length === 0) {
    if (grid) grid.innerHTML = '';
    if (list) list.innerHTML = '';
    if (feedback) {
      feedback.textContent = 'Preencha pelo menos uma força, uma fraqueza, uma oportunidade e uma ameaça no SWOT para criar os cruzamentos.';
      feedback.className = 'swot-feedback hint';
    }
    return;
  }

  if (feedback) {
    feedback.textContent = 'Escreva uma estratégia para cada combinação e clique em Adicionar.';
    feedback.className = 'swot-feedback';
  }

  if (grid) {
    grid.innerHTML = '';
    combos.forEach((combo, idx) => {
      const existing = plan.crossStrategies.find(s => s.type === combo.type && s.a === combo.a && s.b === combo.b);
      const card = document.createElement('div');
      card.className = 'cross-card';
      card.dataset.type = combo.type;
      card.innerHTML = `
        <div class="cross-card-header">
          <span class="cross-type">${combo.type}</span>
          <span class="cross-question">${getTypeExplanation(combo.type)}</span>
        </div>
        <div class="cross-items">
          <div class="cross-item"><strong>${combo.aLabel}</strong><p>${escapeHtml(combo.a)}</p></div>
          <span class="cross-plus">+</span>
          <div class="cross-item"><strong>${combo.bLabel}</strong><p>${escapeHtml(combo.b)}</p></div>
        </div>
        <div class="cross-input-row">
          <input type="text" id="strategy-${combo.type}" value="${existing ? escapeHtml(existing.strategy) : ''}" placeholder="Sua estratégia para essa combinação">
          <button class="btn btn-small add-cross-strategy" data-type="${combo.type}" data-a="${escapeHtml(combo.a)}" data-b="${escapeHtml(combo.b)}">Adicionar</button>
        </div>
      `;
      grid.appendChild(card);
    });

    grid.querySelectorAll('.add-cross-strategy').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        const a = btn.dataset.a;
        const b = btn.dataset.b;
        const input = document.getElementById(`strategy-${type}`);
        if (!input) return;
        const value = input.value.trim();
        if (!value) {
          setCrossFeedback(`Digite uma estratégia para ${type} antes de adicionar.`, 'hint');
          return;
        }

        const idx = plan.crossStrategies.findIndex(s => s.type === type && s.a === a && s.b === b);
        if (idx >= 0) {
          plan.crossStrategies[idx].strategy = value;
        } else {
          plan.crossStrategies.push({ id: 'cs-' + Date.now(), type, a, b, strategy: value });
        }
        savePlan(plan);
        setCrossFeedback(`Estratégia ${type} salva.`, 'success');
        renderSwotCross();
      });
    });
  }

  const aiBtn = document.getElementById('generate-cross-ai');
  if (aiBtn) {
    aiBtn.onclick = () => generateCrossWithAI();
  }

  if (list) {
    list.innerHTML = '';
    plan.crossStrategies.forEach((s, idx) => {
      const chip = document.createElement('div');
      chip.className = 'item-chip';
      chip.innerHTML = `
        <div>
          <div>${escapeHtml(s.strategy)}</div>
          <small>${escapeHtml(s.type)}: ${escapeHtml(s.a)} + ${escapeHtml(s.b)}</small>
        </div>
        <button class="btn btn-small btn-secondary remove-strategy" data-idx="${idx}">Remover</button>
      `;
      list.appendChild(chip);
    });

    list.querySelectorAll('.remove-strategy').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.idx);
        plan.crossStrategies.splice(idx, 1);
        savePlan(plan);
        renderSwotCross();
      });
    });
  }
}

function setCrossFeedback(message, state) {
  const feedback = document.getElementById('cross-feedback');
  if (!feedback) return;
  feedback.textContent = message;
  feedback.className = `swot-feedback${state ? ` ${state}` : ''}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function buildSwotCrossPrompt(items) {
  return `Você é um consultor sênior de planejamento estratégico para e-commerce.

Com base no diagnóstico SWOT abaixo, crie UMA estratégia curta e acionável para cada um dos 4 cruzamentos SWOT:
- FO (Força + Oportunidade): como usar uma força para aproveitar uma oportunidade.
- FA (Força + Ameaça): como usar uma força para se proteger de uma ameaça.
- WO (Fraqueza + Oportunidade): como superar uma fraqueza para não perder uma oportunidade.
- WT (Fraqueza + Ameaça): como se defender de uma ameaça sem depender do ponto fraco.

FORÇAS:
${items.forces.map((f, i) => `${i + 1}. ${f}`).join('\n') || '-'}

FRAQUEZAS:
${items.weaknesses.map((w, i) => `${i + 1}. ${w}`).join('\n') || '-'}

OPORTUNIDADES:
${items.opportunities.map((o, i) => `${i + 1}. ${o}`).join('\n') || '-'}

AMEAÇAS:
${items.threats.map((t, i) => `${i + 1}. ${t}`).join('\n') || '-'}

Responda APENAS com um objeto JSON válido no formato abaixo, sem explicações, sem markdown, sem texto fora do JSON:
{
  "FO": "Estratégia FO aqui",
  "FA": "Estratégia FA aqui",
  "WO": "Estratégia WO aqui",
  "WT": "Estratégia WT aqui"
}`;
}

function parseAIResponse(text) {
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

function extractStrategies(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;

  const keys = ['FO', 'FA', 'WO', 'WT'];
  const result = {};

  for (const key of keys) {
    if (typeof parsed[key] === 'string') {
      result[key] = parsed[key];
    }
  }

  if (Object.keys(result).length === 4) return result;

  for (const value of Object.values(parsed)) {
    if (value && typeof value === 'object') {
      const nested = {};
      for (const key of keys) {
        if (typeof value[key] === 'string') {
          nested[key] = value[key];
        }
      }
      if (Object.keys(nested).length === 4) return nested;
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

async function generateCrossWithAI() {
  const items = getSwotItems();
  const apiKey = getApiKey();

  if (!apiKey) {
    setCrossFeedback('Chave da OpenAI não configurada. Contate o administrador.', 'hint');
    return;
  }

  if (!items.forces.length || !items.weaknesses.length || !items.opportunities.length || !items.threats.length) {
    setCrossFeedback('Preencha pelo menos um item em cada categoria do SWOT antes de usar a IA.', 'hint');
    return;
  }

  const aiBtn = document.getElementById('generate-cross-ai');
  const originalText = aiBtn ? aiBtn.textContent : '';
  if (aiBtn) {
    aiBtn.disabled = true;
    aiBtn.textContent = 'Gerando...';
  }

  setCrossFeedback('Consultando a IA. Isso pode levar alguns segundos...', '');

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
          { role: 'user', content: buildSwotCrossPrompt(items) }
        ],
        temperature: 0.7,
        max_tokens: 1000
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

    const parsed = parseAIResponse(content);
    const strategies = extractStrategies(parsed);

    if (!strategies || !strategies.FO || !strategies.FA || !strategies.WO || !strategies.WT) {
      throw new Error('A IA não retornou o formato esperado.');
    }

    const combos = getCombinations();
    const typeToCombo = { FO: 0, FA: 1, WO: 2, WT: 3 };

    Object.keys(strategies).forEach(type => {
      const combo = combos[typeToCombo[type]];
      if (!combo) return;

      const idx = plan.crossStrategies.findIndex(s => s.type === type && s.a === combo.a && s.b === combo.b);
      const strategy = strategies[type].trim();

      if (idx >= 0) {
        plan.crossStrategies[idx].strategy = strategy;
      } else {
        plan.crossStrategies.push({
          id: 'cs-' + Date.now() + '-' + type,
          type,
          a: combo.a,
          b: combo.b,
          strategy
        });
      }
    });

    savePlan(plan);
    setCrossFeedback('Estratégias geradas com sucesso!', 'success');
    renderSwotCross();
  } catch (err) {
    setCrossFeedback('Erro ao gerar estratégias: ' + err.message, 'hint');
    console.error(err);
  } finally {
    if (aiBtn) {
      aiBtn.disabled = false;
      aiBtn.textContent = originalText;
    }
  }
}
