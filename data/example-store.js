const exampleStore = {
  swot: {
    forces: 'Avaliação 4.8 no Mercado Livre\nFotos próprias de produtos',
    weaknesses: 'Dependência de um único fornecedor\nEstoque desorganizado',
    opportunities: 'Crescimento do TikTok Shop\nAlta do pagamento via Pix',
    threats: 'Guerra de preços com grandes sellers\nAumento do frete',
    cards: [
      { text: 'Reputação alta no marketplace', category: 'Força', userChoice: 'Força' },
      { text: 'Dependência de um único fornecedor', category: 'Fraqueza', userChoice: 'Fraqueza' },
      { text: 'Alta do Pix e do social commerce', category: 'Oportunidade', userChoice: 'Oportunidade' },
      { text: 'Guerra de preços entre concorrentes', category: 'Ameaça', userChoice: 'Ameaça' }
    ]
  },
  crossStrategies: [
    { id: 'cs-1', type: 'FO', a: 'Avaliação 4.8 no Mercado Livre', b: 'Crescimento do TikTok Shop', strategy: 'Criar vídeos de clientes reais usando os produtos para impulsionar o TikTok Shop.' },
    { id: 'cs-2', type: 'FO', a: 'Fotos próprias de produtos', b: 'Alta do pagamento via Pix', strategy: 'Usar fotos originais em campanhas com desconto para pagamento à vista no Pix.' },
    { id: 'cs-3', type: 'FA', a: 'Avaliação 4.8 no Mercado Livre', b: 'Guerra de preços com grandes sellers', strategy: 'Destacar avaliações e atendimento como diferencial em vez de competir só no preço.' }
  ],
  pillars: {
    'Operação': ['Organizar estoque e diversificar fornecedores'],
    'Crescimento': ['Criar vídeos de clientes reais usando os produtos para impulsionar o TikTok Shop.', 'Usar fotos originais em campanhas com desconto para pagamento à vista no Pix.'],
    'Inovação': ['Testar anúncios em novos canais de social commerce'],
    'Experiência do Cliente': ['Destacar avaliações e atendimento como diferencial em vez de competir só no preço.']
  },
  goals: [
    { id: 'g-crescimento', text: 'Aumentar o faturamento de R$ 20 mil para R$ 30 mil/mês em 6 meses', pillar: 'Crescimento' },
    { id: 'g-operacao', text: 'Reduzir ruptura de estoque de 15% para 5% em 3 meses', pillar: 'Operação' }
  ],
  initiatives: [
    { id: 'ex1', goalId: 'g-crescimento', title: 'Reformular fotos dos 10 produtos mais vendidos', owner: 'Ana', due: '2027-01-15', status: 'unassigned' },
    { id: 'ex2', goalId: 'g-operacao', title: 'Negociar 2 novos fornecedores', owner: 'Carlos', due: '2027-02-01', status: 'unassigned' },
    { id: 'ex3', goalId: 'g-crescimento', title: 'Publicar 20 vídeos de clientes no TikTok', owner: 'Ana', due: '2027-03-30', status: 'unassigned' }
  ],
  roadmap: {
    'ex1': 'short',
    'ex2': 'short',
    'ex3': 'medium'
  }
};
