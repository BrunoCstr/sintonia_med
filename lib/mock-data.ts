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
  {
    id: 'q6',
    text: 'Qual é o principal órgão responsável pela produção de bile?',
    alternatives: [
      'Pâncreas',
      'Fígado',
      'Vesícula biliar',
      'Estômago',
      'Intestino delgado',
    ],
    correctAnswer: 1,
    explanation: 'O fígado é o principal órgão responsável pela produção de bile, que é armazenada na vesícula biliar e liberada no duodeno para auxiliar na digestão de gorduras.',
    subject: 'Anatomia',
    difficulty: 'easy',
    period: '1º Período',
    isOfficial: true,
  },
  {
    id: 'q7',
    text: 'Qual hormônio é responsável pela regulação do metabolismo do cálcio no organismo?',
    alternatives: [
      'Insulina',
      'Paratormônio',
      'Cortisol',
      'Tiroxina',
      'Adrenalina',
    ],
    correctAnswer: 1,
    explanation: 'O paratormônio (PTH) é produzido pelas glândulas paratireoides e é o principal regulador do metabolismo do cálcio, aumentando a reabsorção óssea e a reabsorção renal de cálcio.',
    subject: 'Fisiologia',
    difficulty: 'medium',
    period: '2º Período',
    isOfficial: true,
  },
  {
    id: 'q8',
    text: 'Qual é o mecanismo de ação dos anti-inflamatórios não esteroidais (AINEs)?',
    alternatives: [
      'Bloqueio da ciclooxigenase',
      'Inibição da fosfolipase A2',
      'Bloqueio dos receptores de histamina',
      'Inibição da síntese de prostaglandinas',
      'Todas as alternativas acima',
    ],
    correctAnswer: 0,
    explanation: 'Os AINEs atuam bloqueando a enzima ciclooxigenase (COX), que é responsável pela síntese de prostaglandinas a partir do ácido araquidônico, reduzindo assim a inflamação, dor e febre.',
    subject: 'Farmacologia',
    difficulty: 'medium',
    period: '3º Período',
    isOfficial: false,
  },
  {
    id: 'q9',
    text: 'Paciente apresenta febre, tosse produtiva com expectoração purulenta e consolidação pulmonar à radiografia. O diagnóstico mais provável é:',
    alternatives: [
      'Asma',
      'Pneumonia bacteriana',
      'Bronquite crônica',
      'Tuberculose',
      'Enfisema pulmonar',
    ],
    correctAnswer: 1,
    explanation: 'O quadro descrito é clássico de pneumonia bacteriana: febre, tosse produtiva com expectoração purulenta e consolidação pulmonar visível na radiografia de tórax.',
    subject: 'Pneumologia',
    difficulty: 'easy',
    period: '4º Período',
    isOfficial: true,
  },
  {
    id: 'q10',
    text: 'Qual é a principal causa de morte súbita cardíaca em jovens atletas?',
    alternatives: [
      'Infarto do miocárdio',
      'Miocardiopatia hipertrófica',
      'Arritmia ventricular',
      'Dissecção de aorta',
      'Embolia pulmonar',
    ],
    correctAnswer: 1,
    explanation: 'A miocardiopatia hipertrófica é a principal causa de morte súbita cardíaca em jovens atletas, caracterizada por hipertrofia ventricular esquerda desproporcional e risco aumentado de arritmias fatais.',
    subject: 'Cardiologia',
    difficulty: 'hard',
    period: '5º Período',
    isOfficial: true,
  },
  {
    id: 'q11',
    text: 'Qual estrutura do sistema nervoso central é responsável pelo controle da temperatura corporal?',
    alternatives: [
      'Cerebelo',
      'Hipotálamo',
      'Tálamo',
      'Medula espinhal',
      'Córtex cerebral',
    ],
    correctAnswer: 1,
    explanation: 'O hipotálamo é a região do encéfalo responsável pelo controle da temperatura corporal, além de regular outras funções vitais como fome, sede e ritmo circadiano.',
    subject: 'Anatomia',
    difficulty: 'easy',
    period: '1º Período',
    isOfficial: false,
  },
  {
    id: 'q12',
    text: 'Qual é o principal mecanismo de transmissão da hepatite B?',
    alternatives: [
      'Via fecal-oral',
      'Via respiratória',
      'Via parenteral e sexual',
      'Via cutânea',
      'Via vetorial',
    ],
    correctAnswer: 2,
    explanation: 'A hepatite B é transmitida principalmente por via parenteral (sangue e derivados) e sexual, sendo uma das principais causas de hepatite viral crônica.',
    subject: 'Infectologia',
    difficulty: 'medium',
    period: '4º Período',
    isOfficial: true,
  },
  {
    id: 'q13',
    text: 'Qual é o tratamento de primeira linha para asma aguda grave?',
    alternatives: [
      'Antibióticos',
      'Beta-2 agonistas inalatórios',
      'Corticosteroides sistêmicos',
      'Antihistamínicos',
      'Broncodilatadores de longa ação',
    ],
    correctAnswer: 1,
    explanation: 'Os beta-2 agonistas inalatórios de ação curta (como salbutamol) são o tratamento de primeira linha para asma aguda, promovendo broncodilatação rápida.',
    subject: 'Pneumologia',
    difficulty: 'medium',
    period: '4º Período',
    isOfficial: true,
  },
  {
    id: 'q14',
    text: 'Qual é a principal função dos glóbulos vermelhos (eritrócitos)?',
    alternatives: [
      'Defesa imunológica',
      'Transporte de oxigênio',
      'Coagulação sanguínea',
      'Produção de anticorpos',
      'Fagocitose',
    ],
    correctAnswer: 1,
    explanation: 'Os eritrócitos são células especializadas no transporte de oxigênio dos pulmões para os tecidos, através da hemoglobina presente em seu citoplasma.',
    subject: 'Fisiologia',
    difficulty: 'easy',
    period: '2º Período',
    isOfficial: true,
  },
  {
    id: 'q15',
    text: 'Qual é o principal sinal clínico de hipertensão intracraniana?',
    alternatives: [
      'Bradicardia',
      'Papiledema',
      'Hipotensão arterial',
      'Taquicardia',
      'Hipotermia',
    ],
    correctAnswer: 1,
    explanation: 'O papiledema (edema do disco óptico) é um dos principais sinais de hipertensão intracraniana, resultante do aumento da pressão no espaço subaracnóideo ao redor do nervo óptico.',
    subject: 'Neurologia',
    difficulty: 'hard',
    period: '5º Período',
    isOfficial: true,
  },
  {
    id: 'q16',
    text: 'Qual é o principal mecanismo de ação dos antibióticos beta-lactâmicos?',
    alternatives: [
      'Inibição da síntese de ácido fólico',
      'Inibição da síntese de parede celular',
      'Inibição da síntese proteica',
      'Inibição da replicação do DNA',
      'Alteração da permeabilidade da membrana',
    ],
    correctAnswer: 1,
    explanation: 'Os antibióticos beta-lactâmicos (penicilinas, cefalosporinas) atuam inibindo a síntese da parede celular bacteriana, levando à lise celular.',
    subject: 'Farmacologia',
    difficulty: 'medium',
    period: '3º Período',
    isOfficial: true,
  },
  {
    id: 'q17',
    text: 'Qual estrutura do coração separa o átrio direito do ventrículo direito?',
    alternatives: [
      'Válvula mitral',
      'Válvula tricúspide',
      'Válvula aórtica',
      'Válvula pulmonar',
      'Septo interatrial',
    ],
    correctAnswer: 1,
    explanation: 'A válvula tricúspide separa o átrio direito do ventrículo direito, prevenindo o refluxo de sangue durante a sístole ventricular.',
    subject: 'Anatomia',
    difficulty: 'easy',
    period: '1º Período',
    isOfficial: true,
  },
  {
    id: 'q18',
    text: 'Qual é o principal hormônio responsável pela regulação do ciclo menstrual?',
    alternatives: [
      'Estrogênio e progesterona',
      'Testosterona',
      'Cortisol',
      'Insulina',
      'Tiroxina',
    ],
    correctAnswer: 0,
    explanation: 'O ciclo menstrual é regulado principalmente pelos hormônios estrogênio e progesterona, produzidos pelos ovários sob controle do eixo hipotálamo-hipófise-ovário.',
    subject: 'Ginecologia',
    difficulty: 'medium',
    period: '4º Período',
    isOfficial: true,
  },
  {
    id: 'q19',
    text: 'Qual é a principal causa de insuficiência renal aguda pré-renal?',
    alternatives: [
      'Nefrite intersticial',
      'Obstrução do trato urinário',
      'Hipoperfusão renal',
      'Glomerulonefrite',
      'Necrose tubular aguda',
    ],
    correctAnswer: 2,
    explanation: 'A insuficiência renal aguda pré-renal é causada principalmente por hipoperfusão renal, resultante de hipovolemia, choque ou redução do débito cardíaco.',
    subject: 'Nefrologia',
    difficulty: 'hard',
    period: '5º Período',
    isOfficial: true,
  },
  {
    id: 'q20',
    text: 'Qual é o principal sinal clínico de meningite bacteriana?',
    alternatives: [
      'Rigidez de nuca',
      'Hipotensão',
      'Bradicardia',
      'Hipotermia',
      'Hipoglicemia',
    ],
    correctAnswer: 0,
    explanation: 'A rigidez de nuca (meningismo) é um dos principais sinais clínicos de meningite, resultante da irritação das meninges e espasmo dos músculos cervicais.',
    subject: 'Infectologia',
    difficulty: 'medium',
    period: '4º Período',
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

  // Apply filters
  if (filters.period) {
    const periodFiltered = filtered.filter((q) => q.period === filters.period)
    // Only apply period filter if it returns results, otherwise ignore it
    if (periodFiltered.length > 0) {
      filtered = periodFiltered
    }
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

  // If no questions match filters, return all questions (fallback)
  if (filtered.length === 0) {
    filtered = [...mockQuestions]
  }

  // Shuffle and return requested count
  const shuffled = filtered.sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(filters.count, shuffled.length))
}
