document.addEventListener('DOMContentLoaded', () => {
  const steps = document.querySelectorAll('.step');
  const modules = document.querySelectorAll('.module');
  const prevBtn = document.getElementById('prev-step');
  const nextBtn = document.getElementById('next-step');
  const loadExampleBtn = document.getElementById('load-example');
  const startOwnBtn = document.getElementById('start-own');

  function goToStep(n) {
    if (n < 1 || n > modules.length) return;
    if (n > plan.currentStep && !isStepReady(plan.currentStep)) {
      const message = stepHint(plan.currentStep);
      if (!confirm(`${message}\n\nDeseja avançar mesmo assim?`)) return;
    }
    plan.currentStep = n;
    steps.forEach(s => s.classList.toggle('active', parseInt(s.dataset.step) === n));
    modules.forEach(m => m.classList.toggle('active', parseInt(m.id.replace('module-', '')) === n));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    savePlan(plan);
    renderModule(n);
  }

  function isStepReady(step) {
    switch (step) {
      case 1: return (plan.swot.forces + plan.swot.weaknesses + plan.swot.opportunities + plan.swot.threats).trim().length > 0;
      case 2: return plan.crossStrategies.length > 0;
      case 3: return Object.values(plan.pillars || {}).some(list => list.length > 0);
      case 4: return plan.goals && plan.goals.some(g => g.text.trim().length > 0);
      case 5: return plan.initiatives && plan.initiatives.length > 0;
      default: return true;
    }
  }

  function stepHint(step) {
    const hints = {
      1: 'Preencha pelo menos um item do SWOT antes de seguir.',
      2: 'Crie pelo menos uma estratégia cruzada antes de seguir.',
      3: 'Distribua suas estratégias em pelo menos um pilar.',
      4: 'Escreva pelo menos uma meta SMART.',
      5: 'Crie pelo menos uma iniciativa vinculada a uma meta.'
    };
    return hints[step] || 'Esta etapa parece incompleta.';
  }

  function renderModule(n) {
    if (n === 1) renderSwot();
    if (n === 2) renderSwotCross();
    if (n === 3) renderPillars();
    if (n === 4) renderSmart();
    if (n === 5) renderKanban();
    if (n === 6) renderRoadmap();
  }

  steps.forEach(btn => {
    btn.addEventListener('click', () => goToStep(parseInt(btn.dataset.step)));
  });

  prevBtn.addEventListener('click', () => goToStep(plan.currentStep - 1));
  nextBtn.addEventListener('click', () => goToStep(plan.currentStep + 1));

  const apiKeyInput = document.getElementById('api-key-input');
  const saveApiKeyBtn = document.getElementById('save-api-key');
  const apiKeyStatus = document.getElementById('api-key-status');
  const apiKeyBar = document.getElementById('api-key-bar');
  const toggleApiKeyBtn = document.getElementById('toggle-api-key');

  const hasInjectedKey = typeof OPENAI_API_KEY !== 'undefined' && OPENAI_API_KEY !== '__OPENAI_API_KEY__';
  const hasUserKey = !!loadApiKey();
  const keyConfigured = hasInjectedKey || hasUserKey;

  if (apiKeyInput) {
    apiKeyInput.value = loadApiKey();
  }

  function updateApiKeyStatus(message, isError) {
    if (!apiKeyStatus) return;
    apiKeyStatus.textContent = message;
    apiKeyStatus.className = 'api-key-status ' + (isError ? 'error' : 'ok');
  }

  function toggleApiKeyBar(show) {
    if (!apiKeyBar || !toggleApiKeyBtn) return;
    apiKeyBar.style.display = show ? 'flex' : 'none';
    toggleApiKeyBtn.style.display = show ? 'none' : 'inline-flex';
  }

  if (saveApiKeyBtn && apiKeyInput) {
    saveApiKeyBtn.addEventListener('click', () => {
      const key = apiKeyInput.value.trim();
      if (!key) {
        saveApiKey('');
        updateApiKeyStatus('Chave removida.', true);
        return;
      }
      if (!key.startsWith('sk-')) {
        updateApiKeyStatus('Chave inválida.', true);
        return;
      }
      saveApiKey(key);
      updateApiKeyStatus('Chave salva.', false);
      setTimeout(() => toggleApiKeyBar(false), 800);
    });
  }

  if (toggleApiKeyBtn) {
    toggleApiKeyBtn.addEventListener('click', () => toggleApiKeyBar(true));
  }

  if (keyConfigured) {
    toggleApiKeyBar(false);
  } else {
    toggleApiKeyBar(true);
    updateApiKeyStatus('Configure sua chave da OpenAI.', true);
  }

  loadExampleBtn.addEventListener('click', () => {
    if (confirm('Isso substituirá seus dados pelo exemplo da Casa Aurora. Deseja continuar?')) {
      Object.assign(plan, JSON.parse(JSON.stringify(exampleStore)));
      plan.currentStep = 1;
      savePlan(plan);
      renderModule(1);
      goToStep(1);
    }
  });

  startOwnBtn.addEventListener('click', () => {
    plan.currentStep = 1;
    savePlan(plan);
    goToStep(1);
  });

  window.addEventListener('keydown', (e) => {
    const active = document.activeElement;
    const isTyping = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT');
    if (isTyping) return;
    if (e.key === 'ArrowRight') goToStep(plan.currentStep + 1);
    if (e.key === 'ArrowLeft') goToStep(plan.currentStep - 1);
  });

  goToStep(plan.currentStep);
});
