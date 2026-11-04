function getApiKey() {
  return (typeof OPENAI_API_KEY !== 'undefined' && OPENAI_API_KEY !== '__OPENAI_API_KEY__')
    ? OPENAI_API_KEY
    : '';
}

let isCrossAIRequestPending = false;

const crossConfig = {
  FO: { aLabel: 'Força', bLabel: 'Oportunidade', aKey: 'forces', bKey: 'opportunities' },
  FA: { aLabel: 'Força', bLabel: 'Ameaça', aKey: 'forces', bKey: 'threats' },
  WO: { aLabel: 'Fraqueza', bLabel: 'Oportunidade', aKey: 'weaknesses', bKey: 'opportunities' },
  WT: { aLabel: 'Fraqueza', bLabel: 'Ameaça', aKey: 'weaknesses', bKey: 'threats' }
};

function getSwotItems() {
  const parse = (text) => (text || '').split('\n').map(s => s.trim()).filter(Boolean);
  return {
    forces: parse(plan.swot.forces),
    weaknesses: parse(plan.swot.weaknesses),
    opportunities: parse(plan.swot.opportunities),
    threats: parse(plan.swot.threats)
  };
}

function renderSwotCross() {
  if (!plan.crossStrategies) plan.crossStrategies = [];

  const typeSelect = document.getElementById('cross-type');
  const aSelect = document.getElementById('cross-a');
  const bSelect = document.getElementById('cross-b');
  const aLabel = document.getElementById('cross-a-label');
  const bLabel = document.getElementById('cross-b-label');
  const strategyInput = document.getElementById('cross-strategy');
  const addBtn = document.getElementById('add-cross-strategy');
  const aiBtn = document.getElementById('generate-cross-ai');
  const feedback = document.getElementById('cross-feedback');
  const list = document.getElementById('strategies-list');

  const items = getSwotItems();
  const hasSwot = items.forces.length && items.weaknesses.length && items.opportunities.length && items.threats.length;

  if (feedback) {
    if (!hasSwot) {
      feedback.textContent = 'Preencha pelo menos uma força, uma fraqueza, uma oportunidade e uma ameaça no SWOT para criar os cruzamentos.';
      feedback.className = 'swot-feedback hint';
    } else {
      feedback.textContent = '';
      feedback.className = 'swot-feedback';
    }
  }

  if (aiBtn) aiBtn.onclick = () => generateCrossWithAI();
  if (addBtn) addBtn.onclick = () => addCrossStrategy();

  if (typeSelect) {
    typeSelect.onchange = () => {
      updateCrossSelectors(typeSelect.value, items, aSelect, bSelect, aLabel, bLabel);
      if (strategyInput) strategyInput.value = '';
    };
  }

  // Renderiza lista de estratégias
  if (list) {
    list.innerHTML = '';
    if (plan.crossStrategies.length === 0) {
      list.innerHTML = '<p class="empty-list">Nenhuma estratégia criada ainda. Escolha dois itens ao lado para começar.</p>';
    } else {
      plan.crossStrategies.forEach((s, idx) => {
        const chip = document.createElement('div');
        chip.className = 'item-chip';
        renderChipView(chip, s, idx);
        list.appendChild(chip);
      });
    }
  }
}

function renderChipView(chip, s, idx) {
  chip.innerHTML = '';

  const info = document.createElement('div');
  const title = document.createElement('div');
  title.className = 'chip-title';
  title.textContent = s.strategy;
  info.appendChild(title);
  if (s.review && s.review !== 'Nenhuma aparente') {
    const note = document.createElement('small');
    note.className = 'strategy-review-note';
    note.textContent = s.review;
    info.appendChild(note);
  }
  const combo = document.createElement('small');
  combo.textContent = `${s.type}: ${s.a} + ${s.b}`;
  info.appendChild(combo);

  const actions = document.createElement('div');
  actions.className = 'chip-actions';

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'btn btn-small btn-secondary edit-strategy';
  editBtn.title = 'Editar estratégia';
  editBtn.setAttribute('aria-label', 'Editar estratégia');
  editBtn.textContent = '✏️';
  editBtn.addEventListener('click', () => renderChipEdit(chip, s, idx));

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn btn-small btn-secondary remove-strategy';
  removeBtn.title = 'Remover estratégia';
  removeBtn.setAttribute('aria-label', 'Remover estratégia');
  removeBtn.textContent = '🗑️';
  removeBtn.addEventListener('click', () => {
    plan.crossStrategies.splice(idx, 1);
    savePlan(plan);
    renderSwotCross();
  });

  actions.appendChild(editBtn);
  actions.appendChild(removeBtn);
  chip.appendChild(info);
  chip.appendChild(actions);
}

function renderChipEdit(chip, s, idx) {
  chip.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.className = 'chip-edit';

  const textarea = document.createElement('textarea');
  textarea.rows = 3;
  textarea.className = 'chip-edit-input';
  textarea.value = s.strategy;
  wrap.appendChild(textarea);

  const combo = document.createElement('small');
  combo.textContent = `${s.type}: ${s.a} + ${s.b}`;
  wrap.appendChild(combo);

  const actions = document.createElement('div');
  actions.className = 'chip-actions';

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'btn btn-small btn-primary';
  saveBtn.textContent = 'Salvar';
  saveBtn.addEventListener('click', () => {
    const value = textarea.value.trim();
    if (!value) return;
    plan.crossStrategies[idx].strategy = value;
    savePlan(plan);
    renderSwotCross();
  });

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'btn btn-small btn-secondary';
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.addEventListener('click', () => renderChipView(chip, s, idx));

  actions.appendChild(saveBtn);
  actions.appendChild(cancelBtn);
  wrap.appendChild(actions);

  chip.appendChild(wrap);
  textarea.focus();
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

Revise o diagnóstico SWOT abaixo antes de criar UMA estratégia executável para cada cruzamento disponível:
- FO (Força + Oportunidade): como usar uma força para aproveitar uma oportunidade.
- FA (Força + Ameaça): como usar uma força para se proteger de uma ameaça.
- WO (Fraqueza + Oportunidade): como superar uma fraqueza para não perder uma oportunidade.
- WT (Fraqueza + Ameaça): como se defender de uma ameaça sem depender do ponto fraco.

Primeiro, verifique se cada item parece estar na categoria correta: forças e fraquezas são internas; oportunidades e ameaças são externas. Se encontrar uma classificação provável incorreta, não a trate como fato correto nem invente uma substituição. Escreva a estratégia usando o melhor cruzamento disponível e sinalize brevemente a classificação a revisar no campo "revisao".
Para cada estratégia, explique a lógica da combinação e proponha uma ação inicial concreta. Inclua um indicador e um horizonte de tempo somente se houver base nos dados; não invente metas, orçamento, capacidades ou prazos. Quando faltarem dados, indique o que precisa ser definido.
Use somente os dados fornecidos, diferencie fatos de hipóteses e evite conselhos genéricos como "investir em marketing" sem dizer o primeiro passo.

FORÇAS:
${items.forces.map((f, i) => `${i + 1}. ${f}`).join('\n') || '-'}

FRAQUEZAS:
${items.weaknesses.map((w, i) => `${i + 1}. ${w}`).join('\n') || '-'}

OPORTUNIDADES:
${items.opportunities.map((o, i) => `${i + 1}. ${o}`).join('\n') || '-'}

AMEAÇAS:
${items.threats.map((t, i) => `${i + 1}. ${t}`).join('\n') || '-'}

Responda APENAS com um objeto JSON válido no formato abaixo, sem explicações, sem markdown, sem texto fora do JSON. Nos campos "a" e "b", copie EXATAMENTE os itens do SWOT utilizados em cada cruzamento:
{
  "FO": { "estrategia": "Ação concreta, indicador ou dado a definir", "a": "força utilizada", "b": "oportunidade utilizada", "revisao": "Classificação a revisar ou Nenhuma aparente" },
  "FA": { "estrategia": "Ação concreta, indicador ou dado a definir", "a": "força utilizada", "b": "ameaça utilizada", "revisao": "Classificação a revisar ou Nenhuma aparente" },
  "WO": { "estrategia": "Ação concreta, indicador ou dado a definir", "a": "fraqueza utilizada", "b": "oportunidade utilizada", "revisao": "Classificação a revisar ou Nenhuma aparente" },
  "WT": { "estrategia": "Ação concreta, indicador ou dado a definir", "a": "fraqueza utilizada", "b": "ameaça utilizada", "revisao": "Classificação a revisar ou Nenhuma aparente" }
}`;
}

function updateCrossSelectors(type, items, aSelect, bSelect, aLabel, bLabel) {
  const emptyOption = '<option value="">Selecione primeiro o tipo de cruzamento</option>';
  if (!type || !crossConfig[type]) {
    if (aSelect) aSelect.innerHTML = emptyOption;
    if (bSelect) bSelect.innerHTML = emptyOption;
    if (aLabel) aLabel.textContent = 'Item interno';
    if (bLabel) bLabel.textContent = 'Item externo';
    return;
  }

  const config = crossConfig[type];
  if (aLabel) aLabel.textContent = config.aLabel;
  if (bLabel) bLabel.textContent = config.bLabel;

  fillSelect(aSelect, items[config.aKey]);
  fillSelect(bSelect, items[config.bKey]);
}

function fillSelect(select, options) {
  if (!select) return;
  const previous = select.value;
  select.innerHTML = '<option value="">Selecione...</option>';
  options.forEach(text => {
    const opt = document.createElement('option');
    opt.value = text;
    opt.textContent = text;
    select.appendChild(opt);
  });
  if (options.includes(previous)) select.value = previous;
}

function getSelectedCross() {
  const type = document.getElementById('cross-type').value;
  const a = document.getElementById('cross-a').value;
  const b = document.getElementById('cross-b').value;
  if (!type || !a || !b) return null;
  return { type, a, b };
}

function saveCrossStrategy(selected, value) {
  const idx = plan.crossStrategies.findIndex(s => s.type === selected.type && s.a === selected.a && s.b === selected.b);
  if (idx >= 0) {
    plan.crossStrategies[idx].strategy = value;
  } else {
    plan.crossStrategies.push({ id: 'cs-' + Date.now(), ...selected, strategy: value, review: '' });
  }
  savePlan(plan);
}

function addCrossStrategy() {
  const selected = getSelectedCross();
  const strategyInput = document.getElementById('cross-strategy');
  const value = strategyInput ? strategyInput.value.trim() : '';

  if (!selected) {
    setCrossFeedback('Selecione o tipo de cruzamento e os dois itens antes de adicionar.', 'hint');
    return;
  }
  if (!value) {
    setCrossFeedback('Escreva a estratégia antes de adicionar.', 'hint');
    return;
  }

  saveCrossStrategy(selected, value);
  strategyInput.value = '';
  renderSwotCross();
  setCrossFeedback(`Estratégia ${selected.type} salva.`, 'success');
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
  const toStrategy = (value) => {
    if (typeof value === 'string') {
      return { estrategia: value, a: '', b: '', revisao: 'Nenhuma aparente' };
    }
    if (value && typeof value === 'object' && typeof value.estrategia === 'string') {
      return {
        estrategia: value.estrategia,
        a: typeof value.a === 'string' ? value.a : '',
        b: typeof value.b === 'string' ? value.b : '',
        revisao: typeof value.revisao === 'string' ? value.revisao : 'Nenhuma aparente'
      };
    }
    return null;
  };

  const result = {};
  for (const key of keys) {
    const strategy = toStrategy(parsed[key]);
    if (strategy) result[key] = strategy;
  }

  if (Object.keys(result).length === keys.length) return result;

  for (const value of Object.values(parsed)) {
    if (!value || typeof value !== 'object') continue;
    const nested = {};
    for (const key of keys) {
      const strategy = toStrategy(value[key]);
      if (strategy) nested[key] = strategy;
    }
    if (Object.keys(nested).length === keys.length) return nested;
  }

  return Object.keys(result).length > 0 ? result : null;
}

async function generateCrossWithAI() {
  if (isCrossAIRequestPending) return;

  const items = getSwotItems();
  const apiKey = getApiKey();
  const aiBtn = document.getElementById('generate-cross-ai');

  if (!apiKey) {
    setCrossFeedback('Chave da OpenAI não configurada. Contate o administrador.', 'hint');
    return;
  }

  if (!items.forces.length || !items.weaknesses.length || !items.opportunities.length || !items.threats.length) {
    setCrossFeedback('Preencha pelo menos um item em cada categoria do SWOT antes de usar a IA.', 'hint');
    return;
  }

  const originalText = aiBtn ? aiBtn.textContent : '';
  isCrossAIRequestPending = true;
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
        max_tokens: 1600
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

    const strategies = extractStrategies(parseAIResponse(content));
    if (!strategies) {
      throw new Error('A IA não retornou o formato esperado.');
    }

    Object.entries(strategies).forEach(([type, value]) => {
      const idx = plan.crossStrategies.findIndex(s => s.type === type);
      if (idx >= 0) {
        plan.crossStrategies[idx].strategy = value.estrategia.trim();
        plan.crossStrategies[idx].a = value.a;
        plan.crossStrategies[idx].b = value.b;
        plan.crossStrategies[idx].review = value.revisao;
      } else {
        plan.crossStrategies.push({
          id: 'cs-' + Date.now(),
          type,
          a: value.a,
          b: value.b,
          strategy: value.estrategia.trim(),
          review: value.revisao
        });
      }
    });
    savePlan(plan);
    renderSwotCross();
    setCrossFeedback('Estratégias FO, FA, WO e WT geradas e salvas.', 'success');
  } catch (err) {
    setCrossFeedback('Erro ao gerar estratégias: ' + err.message, 'hint');
    console.error(err);
  } finally {
    isCrossAIRequestPending = false;
    if (aiBtn) {
      aiBtn.disabled = false;
      aiBtn.textContent = originalText;
    }
  }
}
