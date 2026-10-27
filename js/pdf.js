document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('export-pdf');
  if (!btn) return;
  btn.addEventListener('click', exportPdf);
});

const COLORS = {
  primary: [37, 99, 235],
  primaryDark: [29, 78, 216],
  success: [22, 163, 74],
  warning: [245, 158, 11],
  danger: [220, 38, 38],
  info: [14, 165, 233],
  purple: [124, 58, 237],
  bg: [248, 250, 252],
  card: [255, 255, 255],
  text: [30, 41, 59],
  textLight: [100, 116, 139],
  border: [226, 232, 240],
  swot: {
    forces: [22, 163, 74],
    weaknesses: [245, 158, 11],
    opportunities: [37, 99, 235],
    threats: [220, 38, 38]
  }
};

const MARGIN = 14;
const WIDTH = 210;
const CONTENT_W = WIDTH - MARGIN * 2;
const PAGE_BOTTOM = 282;

function exportPdf() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = 0;

  y = drawCover(doc, y);

  y = section(doc, '1. Diagnóstico SWOT', y);
  y = swotBlock(doc, 'Forças', plan.swot.forces, COLORS.swot.forces, y);
  y = swotBlock(doc, 'Fraquezas', plan.swot.weaknesses, COLORS.swot.weaknesses, y);
  y = swotBlock(doc, 'Oportunidades', plan.swot.opportunities, COLORS.swot.opportunities, y);
  y = swotBlock(doc, 'Ameaças', plan.swot.threats, COLORS.swot.threats, y);

  y = section(doc, '2. SWOT Cruzado - Estratégias', y);
  if (!plan.crossStrategies || plan.crossStrategies.length === 0) {
    y = body(doc, 'Nenhuma estratégia definida.', y);
  } else {
    plan.crossStrategies.forEach(s => {
      y = ensureSpace(doc, y, 22);
      y = strategyItem(doc, s, y);
    });
  }

  y = section(doc, '3. Pilares Estratégicos', y);
  const pillars = plan.pillars || {};
  const pillarNames = Object.keys(pillars);
  if (pillarNames.length === 0) {
    y = body(doc, 'Nenhum pilar definido.', y);
  } else {
    pillarNames.forEach((pillar, idx) => {
      y = ensureSpace(doc, y, 18);
      y = pillarBlock(doc, pillar, pillars[pillar], idx, y);
    });
  }

  y = section(doc, '4. Metas SMART', y);
  if (!plan.goals || plan.goals.length === 0) {
    y = body(doc, 'Nenhuma meta definida.', y);
  } else {
    plan.goals.forEach(g => {
      if (!g.text || !g.text.trim()) return;
      y = ensureSpace(doc, y, 12);
      y = goalItem(doc, g, y);
    });
  }

  y = section(doc, '5. Iniciativas e Entregas', y);
  if (!plan.initiatives || plan.initiatives.length === 0) {
    y = body(doc, 'Nenhuma iniciativa definida.', y);
  } else {
    y = initiativesTable(doc, plan.initiatives, y);
  }

  y = section(doc, '6. Roadmap', y);
  y = roadmapTable(doc, plan.initiatives || [], plan.roadmap || {}, y);

  addFooters(doc);
  doc.save('plano-estrategico-ecommerce.pdf');
}

function drawCover(doc, y) {
  const h = 34;
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, WIDTH, h, 'F');

  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('Plano Estratégico de E-commerce', MARGIN, 14);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Documento gerado automaticamente a partir do Planejamento Estratégico', MARGIN, 21);

  const dateStr = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  doc.text('Gerado em: ' + dateStr, MARGIN, 27);

  doc.setTextColor(...COLORS.text);
  return h + 10;
}

function pageHeader(doc) {
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, WIDTH, 10, 'F');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('Plano Estratégico de E-commerce', MARGIN, 6.5);
  doc.setTextColor(...COLORS.text);
  doc.setDrawColor(...COLORS.border);
  doc.line(MARGIN, 13, WIDTH - MARGIN, 13);
}

function section(doc, title, y) {
  y = ensureSpace(doc, y, 16);
  doc.setFillColor(...COLORS.bg);
  doc.setDrawColor(...COLORS.border);
  doc.rect(MARGIN, y, CONTENT_W, 9, 'FD');

  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, y + 1.5, MARGIN, y + 7.5);
  doc.setLineWidth(0.2);
  doc.setDrawColor(...COLORS.border);

  doc.setFontSize(12);
  doc.setTextColor(...COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text(title, MARGIN + 3, y + 6);
  doc.setTextColor(...COLORS.text);
  doc.setFont('helvetica', 'normal');
  return y + 13;
}

function swotBlock(doc, label, text, color, y) {
  y = ensureSpace(doc, y, 16);
  doc.setFontSize(10);
  doc.setTextColor(...color);
  doc.setFont('helvetica', 'bold');
  doc.text(label, MARGIN, y);
  y += 5;
  doc.setTextColor(...COLORS.text);
  doc.setFont('helvetica', 'normal');

  const raw = text || '(vazio)';
  const items = raw.split('\n').map(s => s.trim()).filter(Boolean);
  const display = items.length ? items.map(i => '• ' + i) : ['(vazio)'];
  const joined = display.join('\n');
  const lines = doc.splitTextToSize(joined, CONTENT_W - 4);
  doc.text(lines, MARGIN + 2, y);
  return y + lines.length * 4.2 + 4;
}

function strategyItem(doc, s, y) {
  const badgeW = 11;
  const badgeH = 5;
  doc.setFillColor(243, 232, 255);
  doc.setDrawColor(216, 180, 254);
  doc.rect(MARGIN, y - 3.5, badgeW, badgeH, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.purple);
  doc.setFont('helvetica', 'bold');
  doc.text(s.type || '', MARGIN + 1.8, y);

  doc.setTextColor(...COLORS.textLight);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const pair = `${s.a || ''} + ${s.b || ''}`;
  const pairLines = doc.splitTextToSize(pair, CONTENT_W - badgeW - 6);
  doc.text(pairLines, MARGIN + badgeW + 3, y);
  y += Math.max(5, pairLines.length * 3.8);

  doc.setTextColor(...COLORS.text);
  doc.setFont('helvetica', 'normal');
  const stratLines = doc.splitTextToSize(s.strategy || '', CONTENT_W - 6);
  doc.text(stratLines, MARGIN + 3, y);
  y += stratLines.length * 4 + 3;
  return y;
}

function pillarBlock(doc, name, list, idx, y) {
  const colors = [COLORS.success, COLORS.info, COLORS.warning, COLORS.purple];
  const accent = colors[idx % colors.length];

  const items = (list || []).length
    ? list.map(i => '• ' + i).join('\n')
    : '• (vazio)';
  const lines = doc.splitTextToSize(items, CONTENT_W - 8);
  const boxH = 13 + lines.length * 3.8;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...COLORS.border);
  doc.rect(MARGIN, y - 1, CONTENT_W, boxH, 'FD');
  doc.setDrawColor(...accent);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y, MARGIN, y + boxH - 2);
  doc.setLineWidth(0.2);
  doc.setDrawColor(...COLORS.border);

  doc.setFontSize(10);
  doc.setTextColor(...accent);
  doc.setFont('helvetica', 'bold');
  doc.text(name, MARGIN + 3, y + 4);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(9);
  doc.text(lines, MARGIN + 3, y + 9);
  return y + boxH + 3;
}

function goalItem(doc, g, y) {
  const badgeW = contentWidth(g.pillar || 'Geral', 8) + 4;
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(191, 219, 254);
  doc.rect(MARGIN, y - 3.5, badgeW, 5, 'FD');
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text(g.pillar || 'Geral', MARGIN + 2, y);

  doc.setFontSize(9.5);
  doc.setTextColor(...COLORS.text);
  doc.setFont('helvetica', 'normal');
  const lines = doc.splitTextToSize(g.text, CONTENT_W - badgeW - 5);
  doc.text(lines, MARGIN + badgeW + 3, y);
  return y + lines.length * 4 + 3;
}

function initiativesTable(doc, initiatives, y) {
  const cols = [CONTENT_W * 0.46, CONTENT_W * 0.20, CONTENT_W * 0.17, CONTENT_W * 0.17];
  const headers = ['Iniciativa', 'Responsável', 'Prazo', 'Status'];
  const rowH = 6.5;
  const headerH = 7;

  y = ensureSpace(doc, y, headerH + rowH);

  doc.setFillColor(...COLORS.primary);
  doc.setDrawColor(...COLORS.primaryDark);
  doc.rect(MARGIN, y, CONTENT_W, headerH, 'FD');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  let x = MARGIN;
  headers.forEach((h, i) => {
    doc.text(h, x + 1.5, y + 4.7);
    x += cols[i];
  });
  y += headerH;

  doc.setTextColor(...COLORS.text);
  doc.setFont('helvetica', 'normal');
  doc.setDrawColor(...COLORS.border);

  initiatives.forEach((i, idx) => {
    y = ensureSpace(doc, y, rowH);
    if (idx % 2 === 0) {
      doc.setFillColor(...COLORS.bg);
      doc.rect(MARGIN, y, CONTENT_W, rowH, 'F');
    }
    doc.rect(MARGIN, y, CONTENT_W, rowH, 'S');

    const due = formatDate(i.due);
    const status = statusLabel(i.status);
    const statusColor = statusColorRgb(i.status);

    const cells = [i.title || '', i.owner || '—', due, status];
    x = MARGIN;
    cells.forEach((cell, ci) => {
      doc.setFontSize(8.5);
      if (ci === 3) {
        doc.setTextColor(...statusColor);
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setTextColor(...COLORS.text);
        doc.setFont('helvetica', 'normal');
      }
      const lines = doc.splitTextToSize(String(cell), cols[ci] - 3);
      doc.text(lines, x + 1.5, y + 4.2);
      x += cols[ci];
    });
    y += rowH;
  });

  doc.setTextColor(...COLORS.text);
  doc.setFont('helvetica', 'normal');
  return y + 3;
}

function roadmapTable(doc, initiatives, roadmap, y) {
  const labels = { short: 'Curto prazo', medium: 'Médio prazo', long: 'Longo prazo' };
  const terms = ['short', 'medium', 'long'];
  const colW = CONTENT_W / 3;
  const headerH = 7;
  const rowH = 22;

  y = ensureSpace(doc, y, headerH + rowH);

  doc.setFillColor(...COLORS.primary);
  doc.setDrawColor(...COLORS.primaryDark);
  doc.rect(MARGIN, y, CONTENT_W, headerH, 'FD');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  terms.forEach((term, i) => {
    doc.text(labels[term], MARGIN + i * colW + 1.5, y + 4.7);
  });
  y += headerH;

  doc.setDrawColor(...COLORS.border);
  doc.setTextColor(...COLORS.text);
  doc.setFont('helvetica', 'normal');

  y = ensureSpace(doc, y, rowH);
  doc.setFillColor(255, 255, 255);
  doc.rect(MARGIN, y, CONTENT_W, rowH, 'FD');
  terms.forEach((term, i) => {
    const x = MARGIN + i * colW;
    doc.rect(x, y, colW, rowH, 'S');
    const items = initiatives.filter(init => roadmap[init.id] === term);
    let cellY = y + 4;
    if (items.length === 0) {
      doc.setTextColor(...COLORS.textLight);
      doc.setFontSize(8);
      doc.text('(vazio)', x + 2, cellY);
    } else {
      doc.setTextColor(...COLORS.text);
      doc.setFontSize(8);
      items.forEach(item => {
        const line = '• ' + (item.title || '');
        const lines = doc.splitTextToSize(line, colW - 5);
        doc.text(lines, x + 2, cellY);
        cellY += lines.length * 3.5 + 0.5;
      });
    }
  });

  return y + rowH + 3;
}

function body(doc, text, y) {
  y = ensureSpace(doc, y, 8);
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.textLight);
  doc.setFont('helvetica', 'italic');
  const lines = doc.splitTextToSize(text, CONTENT_W);
  doc.text(lines, MARGIN, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.text);
  return y + lines.length * 4.5 + 2;
}

function ensureSpace(doc, y, needed) {
  if (y + needed > PAGE_BOTTOM) {
    doc.addPage();
    pageHeader(doc);
    return 20;
  }
  return y;
}

function contentWidth(text, fontSize) {
  return (text || '').length * fontSize * 0.45;
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year:'numeric' });
}

function statusLabel(status) {
  const map = { todo: 'A fazer', doing: 'Fazendo', done: 'Feito', unassigned: 'Não atribuído' };
  return map[status] || status || '—';
}

function statusColorRgb(status) {
  switch (status) {
    case 'done': return COLORS.success;
    case 'doing': return COLORS.warning;
    case 'todo': return COLORS.textLight;
    default: return COLORS.textLight;
  }
}

function addFooters(doc) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(...COLORS.border);
    doc.line(MARGIN, 287, WIDTH - MARGIN, 287);
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.textLight);
    doc.setFont('helvetica', 'normal');
    doc.text('Planejamento Estratégico para E-commerce', MARGIN, 292);
    doc.text(`Página ${i} de ${total}`, WIDTH - MARGIN, 292, { align: 'right' });
  }
}
