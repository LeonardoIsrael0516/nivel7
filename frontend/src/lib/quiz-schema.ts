export type QuizOption = { id: string; label: string };
export type QuizQuestion = {
  id: string;
  step: number;
  type: "single_choice";
  title: string;
  options: QuizOption[];
};

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "q01_genero",
    step: 1,
    type: "single_choice",
    title: "Qual seu genero?",
    options: [
      { id: "homem", label: "Homem" },
      { id: "mulher", label: "Mulher" },
      { id: "outro", label: "Outro" },
      { id: "prefiro_nao_dizer", label: "Prefiro nao dizer" },
    ],
  },
  {
    id: "q02_faixaEtaria",
    step: 2,
    type: "single_choice",
    title: "Qual sua faixa etaria?",
    options: [
      { id: "18_24", label: "18 — 24" },
      { id: "25_30", label: "25 — 30" },
      { id: "31_38", label: "31 — 38" },
      { id: "39_plus", label: "39+" },
    ],
  },
  {
    id: "q03_objetivoAtual",
    step: 3,
    type: "single_choice",
    title: "Hoje, seu foco e:",
    options: [
      { id: "relacionamento_serio", label: "Relacionamento serio" },
      { id: "conhecer_pessoas", label: "Conhecer pessoas" },
      { id: "autoconfianca", label: "Melhorar autoconfianca" },
      { id: "poder_social", label: "Aumentar poder social" },
    ],
  },
  {
    id: "q04_estiloAtual",
    step: 4,
    type: "single_choice",
    title: "Como voce avalia seu estilo atual?",
    options: [
      { id: "muito_bom", label: "Muito bom" },
      { id: "bom", label: "Bom" },
      { id: "medio", label: "Medio" },
      { id: "fraco", label: "Fraco" },
      { id: "muito_fraco", label: "Muito fraco" },
    ],
  },
  {
    id: "q05_aparenciaFotos",
    step: 5,
    type: "single_choice",
    title: "Como voce se sente com sua aparencia em fotos?",
    options: [
      { id: "muito_bem", label: "Fico muito bem" },
      { id: "bem", label: "Fico bem" },
      { id: "ok", label: "Fico ok" },
      { id: "mal", label: "Nao gosto muito" },
      { id: "muito_mal", label: "Quase nunca gosto" },
    ],
  },
  {
    id: "q06_frequenciaCuidado",
    step: 6,
    type: "single_choice",
    title: "Com que frequencia cuida de cabelo, barba e pele?",
    options: [
      { id: "alta", label: "Sempre, toda semana" },
      { id: "media", label: "As vezes, sem rotina fixa" },
      { id: "baixa", label: "Quase nunca" },
    ],
  },
  {
    id: "q07_roupaDiaADia",
    step: 7,
    type: "single_choice",
    title: "Como costuma se vestir no dia a dia?",
    options: [
      { id: "estrategico", label: "Escolho pensando na imagem" },
      { id: "equilibrado", label: "Conforto com um pouco de estilo" },
      { id: "pratico_sem_estilo", label: "So praticidade" },
      { id: "aleatorio", label: "Depende, sem padrao" },
    ],
  },
  {
    id: "q08_posturaExpressao",
    step: 8,
    type: "single_choice",
    title: "Sua postura e expressao transmitem mais:",
    options: [
      { id: "confianca", label: "Confianca" },
      { id: "neutralidade", label: "Neutralidade" },
      { id: "inseguranca", label: "Inseguranca" },
    ],
  },
  {
    id: "q09_primeiroContato",
    step: 9,
    type: "single_choice",
    title: "Como as pessoas te percebem no primeiro contato?",
    options: [
      { id: "marcante", label: "Marcante e interessante" },
      { id: "educado_neutro", label: "Educado(a), mas neutro(a)" },
      { id: "amigavel_nao_marcante", label: "Amigavel, porem pouco marcante" },
      { id: "intimidante_distante", label: "Distante ou dificil de ler" },
      { id: "confuso", label: "Recebo sinais mistos" },
    ],
  },
  // lead capture inserted here (step 10) in router
  {
    id: "q10_chamaAtencao",
    step: 11,
    type: "single_choice",
    title: "Voce sente que chama atencao quando chega em um ambiente?",
    options: [
      { id: "sempre", label: "Sim, quase sempre" },
      { id: "as_vezes", label: "As vezes" },
      { id: "quase_nunca", label: "Quase nunca" },
    ],
  },
  {
    id: "q11_bloqueioAtual",
    step: 12,
    type: "single_choice",
    title: "Qual seu maior bloqueio hoje para atracao?",
    options: [
      { id: "estilo", label: "Estilo / visual" },
      { id: "confianca", label: "Confianca e postura" },
      { id: "fotos_redes", label: "Fotos e presenca online" },
      { id: "comunicacao", label: "Comunicacao social" },
    ],
  },
  {
    id: "q12_tipoPessoa",
    step: 13,
    type: "single_choice",
    title: "Que tipo de pessoa voce quer atrair?",
    options: [
      { id: "segura", label: "Pessoa segura e decidida" },
      { id: "carinhosa", label: "Pessoa carinhosa e estavel" },
      { id: "ambiciosa", label: "Pessoa ambiciosa e confiante" },
      { id: "sem_rotulo", label: "Sem tipo fixo, quero conexoes" },
    ],
  },
  {
    id: "q13_tempoMelhora",
    step: 14,
    type: "single_choice",
    title: "Em quanto tempo quer perceber melhora?",
    options: [
      { id: "7_dias", label: "Em 7 dias" },
      { id: "15_dias", label: "Em 15 dias" },
      { id: "30_dias", label: "Em 30 dias" },
      { id: "sem_pressa", label: "Sem pressa, mas quero evoluir" },
    ],
  },
  {
    id: "q14_disposicaoAjustar",
    step: 15,
    type: "single_choice",
    title: "Quanto esta disposto(a) a ajustar nos proximos 7 dias?",
    options: [
      { id: "total", label: "Totalmente disposto(a)" },
      { id: "alta", label: "Disposto(a) a mudar bastante" },
      { id: "media", label: "Posso ajustar algumas coisas" },
      { id: "baixa", label: "Pouca disposicao agora" },
    ],
  },
];

// Indexes where extra steps are inserted (after this question index)
export const UPLOAD_AFTER_INDEX = 1; // after q02
export const LEAD_CAPTURE_AFTER_INDEX = 9; // after q10

export const UPLOAD_STEP = UPLOAD_AFTER_INDEX + 2;
export const LEAD_STEP =
  LEAD_CAPTURE_AFTER_INDEX + 2 + (LEAD_CAPTURE_AFTER_INDEX > UPLOAD_AFTER_INDEX ? 1 : 0);

export const TOTAL_QUIZ_STEPS = QUIZ_QUESTIONS.length + 2; // + upload + lead
