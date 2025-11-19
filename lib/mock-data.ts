export interface Question {
  id: string
  text: string
  alternatives: string[]
  correctAnswer: number
  explanation: string
  subject: string
  difficulty: 'easy' | 'medium' | 'hard'
  period: string
  isOfficial: boolean
}

export const mockQuestions: Question[] = [
  {
    id: 'q1',
    text: 'Um paciente de 65 anos apresenta dor retroesternal em aperto, irradiada para membro superior esquerdo, com duração de 30 minutos. O diagnóstico mais provável é:',
    alternatives: [
      'Pericardite aguda',
      'Infarto agudo do miocárdio',
      'Angina estável',
      'Dissecção de aorta',
      'Refluxo gastroesofágico',
    ],
    correctAnswer: 1,
    explanation: 'O quadro clássico de IAM inclui dor retroesternal em aperto, com irradiação para MSE, duração superior a 20 minutos e não responsiva a nitratos. A dor da angina estável tem duração menor e é desencadeada por esforço. Pericardite cursa com dor pleurítica. A dissecção de aorta apresenta dor dilacerante súbita.',
    subject: 'Cardiologia',
    difficulty: 'medium',
    period: '5º Período',
    isOfficial: true,
  },
  {
    id: 'q2',
    text: 'Qual estrutura anatômica separa as cavidades torácica e abdominal?',
    alternatives: [
      'Músculo reto abdominal',
      'Diafragma',
      'Pleura parietal',
      'Peritônio',
      'Músculo transverso do abdome',
    ],
    correctAnswer: 1,
    explanation: 'O diafragma é o principal músculo respiratório e separa a cavidade torácica da cavidade abdominal. É inervado pelo nervo frênico (C3-C5) e possui aberturas para passagem de estruturas importantes como a aorta, veia cava inferior e esôfago.',
    subject: 'Anatomia',
    difficulty: 'easy',
    period: '1º Período',
    isOfficial: true,
  },
  {
    id: 'q3',
    text: 'Em relação à fisiologia da contração muscular, qual molécula fornece energia direta para o desligamento da miosina da actina?',
    alternatives: [
      'Glicose',
      'Creatina fosfato',
      'ATP',
      'ADP',
      'Cálcio',
    ],
    correctAnswer: 2,
    explanation: 'O ATP (adenosina trifosfato) é essencial para a contração muscular. Quando o ATP se liga à cabeça da miosina, causa o desligamento da miosina da actina. A hidrólise do ATP em ADP fornece energia para o movimento da cabeça da miosina. O cálcio é importante para expor os sítios de ligação na actina, mas não fornece energia diretamente.',
    subject: 'Fisiologia',
    difficulty: 'medium',
    period: '2º Período',
    isOfficial: false,
  },
  {
    id: 'q4',
    text: 'Paciente com diabetes mellitus tipo 2 mal controlado apresenta ferida no pé que não cicatriza. O principal mecanismo fisiopatológico envolvido é:',
    alternatives: [
      'Hipercoagulabilidade',
      'Neuropatia e vasculopatia periférica',
      'Aumento da resposta inflamatória',
      'Hiperatividade do sistema imune',
      'Redução da síntese de colágeno',
    ],
    correctAnswer: 1,
    explanation: 'No diabetes mellitus, a hiperglicemia crônica leva a complicações micro e macrovasculares. A neuropatia periférica reduz a sensibilidade, predispondo a traumas. A vasculopatia compromete o aporte sanguíneo, dificultando a cicatrização. Essas duas condições associadas são os principais fatores para o desenvolvimento do pé diabético.',
    subject: 'Patologia',
    difficulty: 'medium',
    period: '4º Período',
    isOfficial: true,
  },
  {
    id: 'q5',
    text: 'Qual fármaco é considerado de primeira linha no tratamento da hipertensão arterial sistêmica em pacientes com diabetes mellitus?',
    alternatives: [
      'Beta-bloqueadores',
      'Diuréticos tiazídicos',
      'Bloqueadores dos canais de cálcio',
      'Inibidores da ECA',
      'Alfa-bloqueadores',
    ],
    correctAnswer: 3,
    explanation: 'Os inibidores da ECA (enzima conversora de angiotensina) são preferidos em pacientes diabéticos com hipertensão por oferecerem proteção renal adicional, reduzindo a progressão da nefropatia diabética. Atuam reduzindo a formação de angiotensina II e aumentando a bradicinina, promovendo vasodilatação e redução da pressão arterial.',
    subject: 'Farmacologia',
    difficulty: 'medium',
    period: '3º Período',
    isOfficial: true,
  },
]

export function generateQuiz(filters: {
  period?: string
  subjects?: string[]
  difficulty?: string
  official?: boolean
  count: number
}): Question[] {
  let filtered = [...mockQuestions]

  if (filters.period) {
    filtered = filtered.filter((q) => q.period === filters.period)
  }

  if (filters.subjects && filters.subjects.length > 0) {
    filtered = filtered.filter((q) => filters.subjects!.includes(q.subject))
  }

  if (filters.difficulty) {
    filtered = filtered.filter((q) => q.difficulty === filters.difficulty)
  }

  if (filters.official !== undefined) {
    filtered = filtered.filter((q) => q.isOfficial === filters.official)
  }

  // Shuffle and return requested count
  const shuffled = filtered.sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(filters.count, shuffled.length))
}
