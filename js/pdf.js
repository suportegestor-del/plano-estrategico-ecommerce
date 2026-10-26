document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('export-pdf');
  if (!btn) return;
  btn.addEventListener('click', exportPdf);
});

function exportPdf() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  let y = 16;

  doc.setFontSize(18);
  doc.text('Plano Estratégico de E-commerce', 14, y);
  y += 10;

  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text('Gerado em: ' + new Date().toLocaleDateString('pt-BR'), 14, y);
  y += 12;

  doc.setTextColor(0);

  y = section(doc, '1. Diagnóstico SWOT', y);
  y = textBlock(doc, 'Forças:', plan.swot.forces, y);
  y = textBlock(doc, 'Fraquezas:', plan.swot.weaknesses, y);
  y = textBlock(doc, 'Oportunidades:', plan.swot.opportunities, y);
  y = textBlock(doc, 'Ameaças:', plan.swot.threats, y);

  y = section(doc, '2. SWOT Cruzado - Estratégias', y);
  if (plan.crossStrategies.length === 0) {
    y = body(doc, 'Nenhuma estratégia definida.', y);
  } else {
    plan.crossStrategies.forEach(s => {
      y = body(doc, `[${s.type}] ${s.a} + ${s.b}`, y);
      y = body(doc, `    → ${s.strategy}`, y);
    });
  }

  y = section(doc, '3. Pilares Estratégicos', y);
  Object.entries(plan.pillars || {}).forEach(([pillar, list]) => {
    y = body(doc, `${pillar}:`, y);
    list.forEach(item => y = body(doc, `  • ${item}`, y));
  });

  y = section(doc, '4. Metas SMART', y);
  if (!plan.goals || plan.goals.length === 0) {
    y = body(doc, 'Nenhuma meta definida.', y);
  } else {
    plan.goals.forEach(g => {
      if (g.text.trim()) y = body(doc, `• [${g.pillar}] ${g.text}`, y);
    });
  }

  y = section(doc, '5. Iniciativas e Entregas', y);
  if (!plan.initiatives || plan.initiatives.length === 0) {
    y = body(doc, 'Nenhuma iniciativa definida.', y);
  } else {
    plan.initiatives.forEach(i => {
      y = body(doc, `• ${i.title} — ${i.owner || 'Sem responsável'} — ${i.due || 'Sem prazo'} — ${statusLabel(i.status)}`, y);
    });
  }

  y = section(doc, '6. Roadmap', y);
  const terms = { short: 'Curto prazo', medium: 'Médio prazo', long: 'Longo prazo' };
  Object.entries(terms).forEach(([key, label]) => {
    y = body(doc, `${label}:`, y);
    const items = (plan.initiatives || []).filter(i => plan.roadmap[i.id] === key);
    if (items.length === 0) y = body(doc, '  (vazio)', y);
    items.forEach(i => y = body(doc, `  • ${i.title}`, y));
  });

  doc.save('plano-estrategico-ecommerce.pdf');
}

function section(doc, title, y) {
  if (y > 270) { doc.addPage(); y = 16; }
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text(title, 14, y);
  doc.setFont(undefined, 'normal');
  return y + 8;
}

function textBlock(doc, label, text, y) {
  if (y > 270) { doc.addPage(); y = 16; }
  doc.setFont(undefined, 'bold');
  doc.text(label, 14, y);
  doc.setFont(undefined, 'normal');
  y += 6;
  const lines = doc.splitTextToSize(text || '(vazio)', 180);
  doc.text(lines, 14, y);
  return y + lines.length * 5 + 4;
}

function body(doc, text, y) {
  if (y > 270) { doc.addPage(); y = 16; }
  const lines = doc.splitTextToSize(text, 180);
  doc.text(lines, 14, y);
  return y + lines.length * 5 + 1;
}

function statusLabel(status) {
  const map = { todo: 'A fazer', doing: 'Fazendo', done: 'Feito' };
  return map[status] || status;
}
