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
      list.innerHTML = '<p class="empty-list">Nenhuma estratégia criada ainda. Selecione os itens ao lado (um ou vários) para começar.</p>';
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

function toTextArray(value) {
  if (Array.isArray(value)) return value.filter(v => typeof v === 'string' && v.trim()).map(v => v.trim());
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function crossComboKey(type, a, b) {
  const norm = (arr) => toTextArray(arr).map(s => s.toLowerCase()).sort().join('||');
  return `${type}::${norm(a)}::${norm(b)}`;
}

function crossComboLabel(s) {
  const codes = (items) => toTextArray(items).map(t => getSwotCode(t) || '?').join(' + ');
  return `${s.type}: ${codes(s.a)} + ${codes(s.b)}`;
}

function crossItemsDetail(s) {
  const parts = [...toTextArray(s.a), ...toTextArray(s.b)];
  return parts.map(t => {
    const code = getSwotCode(t);
    return code ? `${code} ${t}` : t;
  }).join(' · ');
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
  combo.className = 'chip-combo';
  combo.textContent = crossComboLabel(s);
  info.appendChild(combo);
  const detail = document.createElement('small');
  detail.className = 'chip-items';
  detail.textContent = crossItemsDetail(s);
  info.appendChild(detail);

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
  combo.className = 'chip-combo';
  combo.textContent = crossComboLabel(s);
  wrap.appendChild(combo);

  const detail = document.createElement('small');
  detail.className = 'chip-items';
  detail.textContent = crossItemsDetail(s);
  wrap.appendChild(detail);

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
  const coded = (list, code) => list.map((f, i) => `${code}${i + 1}. ${f}`);
  return `Você é um consultor sênior de planejamento estratégico para e-commerce.

Revise o diagnóstico SWOT abaixo (já numerado) e crie estratégias executáveis, cobrindo as combinações mais relevantes entre:
- FO (Força + Oportunidade): como usar forças para aproveitar oportunidades.
- FA (Força + Ameaça): como usar forças para se proteger de ameaças.
- WO (Fraqueza + Oportunidade): como superar fraquezas para não perder oportunidades.
- WT (Fraqueza + Ameaça): como se defender de ameaças sem depender dos pontos fracos.

Diretrizes importantes:
- Gere aproximadamente 3 estratégias para cada tipo de cruzamento (FO, FA, WO e WT) — cerca de 12 no total.
- Varie as combinações: cada estratégia deve usar itens diferentes do SWOT sempre que possível. Se houver poucos itens em alguma categoria, varie o ângulo da estratégia em vez de repetir a mesma combinação com o mesmo enfoque.
- Quando duas forças (ou duas fraquezas, etc.) se complementarem para uma mesma estratégia, inclua ambas no campo "a" — isso é encorajado.
- Priorize as combinações de maior impacto para um e-commerce de pequeno/médio porte.
- Primeiro, verifique se cada item parece estar na categoria correta: forças e fraquezas são internas; oportunidades e ameaças são externas. Se encontrar uma classificação provável incorreta, não a trate como fato correto nem invente uma substituição. Escreva a estratégia usando o melhor cruzamento disponível e sinalize brevemente a classificação a revisar no campo "revisao".
- Para cada estratégia, explique a lógica da combinação e proponha uma ação inicial concreta. Inclua um indicador e um horizonte de tempo somente se houver base nos dados; não invente metas, orçamento, capacidades ou prazos. Quando faltarem dados, indique o que precisa ser definido.
- Use somente os dados fornecidos, diferencie fatos de hipóteses e evite conselhos genéricos como "investir em marketing" sem dizer o primeiro passo.

FORÇAS:
${coded(items.forces, 'S').join('\n') || '-'}

FRAQUEZAS:
${coded(items.weaknesses, 'W').join('\n') || '-'}

OPORTUNIDADES:
${coded(items.opportunities, 'O').join('\n') || '-'}

AMEAÇAS:
${coded(items.threats, 'T').join('\n') || '-'}

Responda APENAS com um objeto JSON válido no formato abaixo, sem explicações, sem markdown, sem texto fora do JSON. Os campos "a" e "b" devem conter os textos EXATOS dos itens do SWOT utilizados (sem o prefixo do código):
{
  "estrategias": [
    { "tipo": "FO", "a": ["força utilizada"], "b": ["oportunidade utilizada"], "estrategia": "Ação concreta, indicador ou dado a definir", "revisao": "Classificação a revisar ou Nenhuma aparente" }
  ]
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
  const previous = Array.from(select.selectedOptions).map(o => o.value);
  select.innerHTML = '';
  options.forEach(text => {
    const opt = document.createElement('option');
    opt.value = text;
    const code = getSwotCode(text);
    opt.textContent = code ? `${code} — ${text}` : text;
    select.appendChild(opt);
  });
  previous.forEach(value => {
    const opt = Array.from(select.options).find(o => o.value === value);
    if (opt) opt.selected = true;
  });
}

function getSelectedCross() {
  const type = document.getElementById('cross-type').value;
  const aSelect = document.getElementById('cross-a');
  const bSelect = document.getElementById('cross-b');
  const a = aSelect ? Array.from(aSelect.selectedOptions).map(o => o.value).filter(Boolean) : [];
  const b = bSelect ? Array.from(bSelect.selectedOptions).map(o => o.value).filter(Boolean) : [];
  if (!type || a.length === 0 || b.length === 0) return null;
  return { type, a, b };
}

function saveCrossStrategy(selected, value) {
  const key = crossComboKey(selected.type, selected.a, selected.b);
  const idx = plan.crossStrategies.findIndex(s => crossComboKey(s.type, s.a, s.b) === key);
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

  const fromListItem = (item) => {
    if (!item || typeof item !== 'object') return null;
    const type = typeof item.tipo === 'string' ? item.tipo.trim().toUpperCase() : '';
    if (!crossConfig[type]) return null;
    const estrategia = typeof item.estrategia === 'string' ? item.estrategia.trim() : '';
    if (!estrategia) return null;
    return {
      type,
      a: toTextArray(item.a),
      b: toTextArray(item.b),
      estrategia,
      revisao: typeof item.revisao === 'string' && item.revisao.trim() ? item.revisao.trim() : 'Nenhuma aparente'
    };
  };

  // Novo formato: { "estrategias": [ ... ] } (ou um array direto)
  const list = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.estrategias) ? parsed.estrategias : null);
  if (list) {
    const strategies = list.map(fromListItem).filter(Boolean);
    return strategies.length ? strategies : null;
  }

  // Formato antigo (fallback): { "FO": {...}, "FA": {...}, "WO": {...}, "WT": {...} }
  const keys = ['FO', 'FA', 'WO', 'WT'];
  const toStrategy = (value) => {
    if (typeof value === 'string') {
      return { estrategia: value, a: [], b: [], revisao: 'Nenhuma aparente' };
    }
    if (value && typeof value === 'object' && typeof value.estrategia === 'string') {
      return {
        estrategia: value.estrategia,
        a: toTextArray(value.a),
        b: toTextArray(value.b),
        revisao: typeof value.revisao === 'string' ? value.revisao : 'Nenhuma aparente'
      };
    }
    return null;
  };

  const legacy = [];
  for (const key of keys) {
    const value = toStrategy(parsed[key]);
    if (value) legacy.push({ type: key, ...value });
  }
  return legacy.length ? legacy : null;
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
        max_tokens: 4000
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

    let added = 0;
    let updated = 0;
    strategies.forEach((value, i) => {
      const key = crossComboKey(value.type, value.a, value.b);
      const idx = plan.crossStrategies.findIndex(s => crossComboKey(s.type, s.a, s.b) === key);
      if (idx >= 0) {
        plan.crossStrategies[idx].strategy = value.estrategia;
        plan.crossStrategies[idx].review = value.revisao;
        updated++;
      } else {
        plan.crossStrategies.push({
          id: 'cs-' + Date.now() + '-' + i,
          type: value.type,
          a: value.a,
          b: value.b,
          strategy: value.estrategia,
          review: value.revisao
        });
        added++;
      }
    });
    savePlan(plan);
    renderSwotCross();
    setCrossFeedback(
      `${added} estratégia(s) gerada(s) pela IA${updated ? `, ${updated} existente(s) atualizada(s)` : ''}. Total no plano: ${plan.crossStrategies.length}.`,
      'success'
    );
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
