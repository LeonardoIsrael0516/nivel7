import type { QuizAnswers } from "@/contexts/QuizContext";
import type { ScoreResult } from "@/lib/scoring";

export const UPGRADE_CHECKOUT_STORAGE_KEY = "nivel7_upgrade_checkout";

export type PillarBlock = {
  key: "estilo" | "simetria" | "presenca";
  title: string;
  scoreLabel: string;
  body: string;
};

export type CompletoExtras = {
  archetypeTitle: string;
  archetypeDeep: string;
  blockingTitle: string;
  blockingBody: string;
  sevenDayPlan: string[];
  firstImpressionTitle: string;
  firstImpressionBody: string;
  simulationTitle: string;
  simulationBody: string;
  projectedNote: number;
  attractionLiftPercent: number;
};

export type BuiltResultReport = {
  headlineSummary: string;
  pillars: PillarBlock[];
  /** Vazio quando answers incompletos no basico (evita dicas inventadas). */
  practicalTips: string[];
  completo: CompletoExtras | null;
};

function stableHash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h << 5) - h + input.charCodeAt(i);
  return Math.abs(h);
}

function estiloParagraph(a: QuizAnswers, estilo: number): string {
  const est = a.q04_estiloAtual;
  const roupa = a.q07_roupaDiaADia;
  const cuidado = a.q06_frequenciaCuidado;
  const parts: string[] = [];
  if (est === "muito_fraco" || est === "fraco") {
    parts.push(
      "Seu estilo ainda nao assina uma identidade clara: a leitura rapida e de 'neutro demais' ou sem direcao.",
    );
  } else if (est === "medio") {
    parts.push(
      "Seu estilo esta no meio-termo: funciona no dia a dia, mas nao amplifica a impressao que voce quer causar.",
    );
  } else {
    parts.push(
      "Seu estilo tem base solida; o foco agora e alinhar detalhes para que a mensagem visual fique coerente com seus objetivos.",
    );
  }
  if (cuidado === "baixa")
    parts.push(
      "A rotina de cuidado baixa puxa a nota de estilo para baixo mesmo quando o potencial existe.",
    );
  if (roupa === "pratico_sem_estilo" || roupa === "aleatorio")
    parts.push(
      "Roupas muito praticas ou irregulares comunicam falta de intencao — o cerebro do outro interpreta como baixa prioridade de imagem.",
    );
  parts.push(`Nota de estilo (componente do Nivel de Aparencia): ${estilo.toFixed(1)}/10.`);
  return parts.join(" ");
}

function simetriaParagraph(a: QuizAnswers, sim: number): string {
  const f = a.q05_aparenciaFotos;
  if (f === "muito_mal" || f === "mal") {
    return `Em fotos e primeira leitura visual, voce sente desalinhamento — isso costuma vir de angulo, luz ou consistencia, nao so de 'beleza'. Nota de simetria/percepcao em foto: ${sim.toFixed(1)}/10.`;
  }
  if (f === "ok") {
    return `Em fotos voce fica aceitavel, mas sem 'wow' — pequenos ajustes de expressao e luz costumam render mais que mudar traco. ${sim.toFixed(1)}/10.`;
  }
  return `Sua leitura em foto esta positiva; mantenha consistencia para que o digital e o presencial contem a mesma historia. ${sim.toFixed(1)}/10.`;
}

function presencaParagraph(a: QuizAnswers, pres: number): string {
  const post = a.q08_posturaExpressao;
  const att = a.q10_chamaAtencao;
  const parts: string[] = [];
  if (post === "inseguranca")
    parts.push(
      "Postura e expressao puxam para inseguranca percebida — antes de qualquer roupa cara, o corpo conta a historia.",
    );
  else if (post === "neutralidade")
    parts.push("Voce transmite neutralidade: nao afasta, mas tambem nao ancora atencao.");
  else
    parts.push(
      "Confianca percebida ajuda a sustentar presenca; combine com olhar e ritmo para nao parecer 'duro' ou distante.",
    );
  if (att === "quase_nunca")
    parts.push(
      "Quando a presenca nao chama atencao no ambiente, o padrao e ser lembrado pelo papel social, nao pela atracao visual.",
    );
  else if (att === "sempre")
    parts.push(
      "Voce chama atencao — o risco e a leitura errada se o visual nao acompanha a energia.",
    );
  parts.push(`${pres.toFixed(1)}/10 na dimensao presenca.`);
  return parts.join(" ");
}

const TIP_POOL: { test: (a: QuizAnswers) => boolean; text: string }[] = [
  {
    test: (a) => a.q06_frequenciaCuidado === "baixa",
    text: "Agende 2 blocos de 20 min por semana so para grooming (cabelo/barba/pele): constancia vence intensidade esporadica.",
  },
  {
    test: (a) => a.q04_estiloAtual === "fraco" || a.q04_estiloAtual === "muito_fraco",
    text: "Monte um mini-capsula de 5 pecas neutras que combinam entre si — reduz decisao matinal e sobe o nivel mediano do visual.",
  },
  {
    test: (a) => a.q07_roupaDiaADia === "aleatorio",
    text: "Defina uma 'uniforme informal' para trabalho/saida: 2 calcas, 3 tops, 1 camada — mesmo gosto, menos ruido visual.",
  },
  {
    test: (a) => a.q08_posturaExpressao === "inseguranca",
    text: "Exercicio diario: 2 minutos em pe, ombros para tras, queixo neutro, olhar ao horizonte — antes de entrar em qualquer ambiente.",
  },
  {
    test: (a) => a.q09_primeiroContato === "amigavel_nao_marcante",
    text: "Teste uma assinatura visual leve (cor ou textura) para deixar de ser 'simpatico neutro' sem parecer fora do seu estilo.",
  },
  {
    test: (a) => a.q05_aparenciaFotos === "mal" || a.q05_aparenciaFotos === "muito_mal",
    text: "Tire 10 fotos de rosto com luz lateral suave; escolha 1 como referencia de angulo seguro para redes e WhatsApp.",
  },
  {
    test: (a) => a.q10_chamaAtencao === "quase_nunca",
    text: "Entrada em ambiente: 3 segundos de pausa na porta, sorriso leve, primeiro contato visual — isso aumenta presenca sem 'performar'.",
  },
  {
    test: (a) => a.q11_bloqueioAtual === "fotos_redes",
    text: "Alinhe foto de perfil, primeira imagem do feed e foto de WhatsApp — leitura inconsistente entre canais mata confianca.",
  },
  {
    test: (a) => a.q11_bloqueioAtual === "estilo",
    text: "Liste 3 itens que voce usa por habito mas nao gosta; remova um por semana ate sentir leveza no espelho.",
  },
  {
    test: (a) => a.q11_bloqueioAtual === "confianca",
    text: "Combine ajuste fisico pequeno (postura + roupa) com uma micro-acao social diaria (cumprimentar com nome).",
  },
  {
    test: (a) => a.q11_bloqueioAtual === "comunicacao",
    text: "Treine abertura de conversa em uma linha honesta + pergunta aberta; evite monologo quando nervoso.",
  },
  {
    test: (a) => a.q14_disposicaoAjustar === "total" || a.q14_disposicaoAjustar === "alta",
    text: "Com sua disposicao alta, aplique uma mudanca visivel na semana 1 (corte, barba, ou par de sapatos) para criar momentum.",
  },
  {
    test: (a) => a.q13_tempoMelhora === "7_dias",
    text: "Plano de 7 dias: dia 1 espelho, dia 2 roupa, dia 3 foto, dia 4 postura, dia 5 grooming, dia 6 redes, dia 7 revisao.",
  },
  {
    test: (a) => a.q03_objetivoAtual === "relacionamento_serio",
    text: "Para relacionamento serio, priorize sinais de cuidado e estabilidade (roupa limpa, barbear consistente, arrumacao).",
  },
  {
    test: (a) => a.q03_objetivoAtual === "poder_social",
    text: "Para presenca social, uma peca com estrutura (jaqueta/camisa bem ajustada) eleva autoridade percebida rapidamente.",
  },
  {
    text: "Durma com horario fixo 5 noites seguidas: pele e expressao melhoram mais que qualquer filtro.",
  },
  {
    text: "Evite logos grandes e estampas ruidosas em primeiro encontro ou mensagem profissional — simplifique o topo do corpo.",
  },
  {
    text: "Use espelho lateral: ajuste o angulo do peso do corpo e alinhamento do pescoco antes de fotos de corpo inteiro.",
  },
  {
    text: "Hidratacao e sombra leve nos olhos (se aplicavel) melhoram foto mesmo em homens — naturalidade e o alvo.",
  },
  {
    text: "Reserve um par de calcados 'saida' limpo; calcado marcado quebra a leitura de cuidado.",
  },
  {
    text: "Corte de cabelo com manutencao clara (data na agenda): crescimento desalinhado sinaliza desleixo mais que estilo.",
  },
];

function pickPracticalTips(answers: QuizAnswers, archetypeId: string, limit: number): string[] {
  const picked: string[] = [];
  const seen = new Set<string>();
  const orderSeed = stableHash(archetypeId + JSON.stringify(answers));
  const reordered = [...TIP_POOL].sort(
    (a, b) => stableHash(a.text + orderSeed) - stableHash(b.text + orderSeed),
  );
  for (const item of reordered) {
    if (!item.test || item.test(answers)) {
      if (!seen.has(item.text)) {
        seen.add(item.text);
        picked.push(item.text);
      }
    }
    if (picked.length >= limit) break;
  }
  let i = 0;
  while (picked.length < limit && i < TIP_POOL.length) {
    const t = TIP_POOL[i].text;
    if (!seen.has(t)) {
      seen.add(t);
      picked.push(t);
    }
    i++;
  }
  return picked.slice(0, limit);
}

const ARCHETYPE_DEEP: Record<string, string> = {
  atracao_silenciosa:
    "Voce gera curiosidade inicial, mas a conversa visual nao fixa uma narrativa. O padrao e ser 'interessante por um instante' e depois virar plano de fundo. O upgrade de atracao vem de assinatura clara: cor, corte, postura repetivel e fotos coerentes.",
  potencial_negligenciado:
    "Sua base (simetria percebida e tracos) sustenta uma nota melhor do que o conjunto mostra hoje. O gargalo e lapidacao: grooming, roupa com intencao e fotos alinhadas com quem voce quer atrair.",
  presenca_neutra:
    "Neutralidade e segura socialmente, mas e um teto para atracao romantica. Voce precisa de 1–2 escolhas visuais que comuniquem direcao e desejo sem parecer caricato.",
  intensidade_desalinhada:
    "Energia alta com leitura visual confusa gera atracao ambigua: ou intimida, ou parece inconsistente. Alinhar estilo ao tom da sua presenca reduz ruido e aumenta conexao.",
  imagem_inconsistente:
    "Cuidado irregular cria uma historia oscilante — hoje voce parece bem investido, amanha desleixado. Rotinas pequenas e repetiveis corrigem mais que grandes mudancas esporadicas.",
};

const BLOCKING_COPY: Record<string, { title: string; body: string }> = {
  estilo: {
    title: "Bloqueio principal: estilo / visual",
    body: "Seu maior gargalo hoje e o pacote visual: combinacoes, higiene visual e coerencia entre ambientes. Ajustes pequenos e repetidos geram salto desproporcional na percepcao.",
  },
  confianca: {
    title: "Bloqueio principal: confianca e postura",
    body: "O corpo e o rosto estao contando uma historia de cautela. Isso reduz a leitura de valor antes de qualquer conversa profunda.",
  },
  fotos_redes: {
    title: "Bloqueio principal: fotos e presenca online",
    body: "Seu offline e online nao contam a mesma historia — isso destroi confianca na primeira busca. Alinhar fotos e mensagem visual e o alavancagem mais rapida.",
  },
  comunicacao: {
    title: "Bloqueio principal: comunicacao social",
    body: "A leitura visual ate ajuda, mas o padrao de abertura e continuidade de conversa precisa acompanhar — senao a imagem parece 'fachada'.",
  },
};

const FIRST_IMPRESSION: Record<string, string> = {
  marcante:
    "Voce e lido(a) como presenca forte desde o inicio; o risco e parecer inacessivel. Suavize com sorriso sincero e primeira frase calorosa.",
  educado_neutro:
    "Primeira impressao: educado(a) e seguro(a), mas sem tensao romantica. Adicione um detalhe memoravel (cor, acessorio, timing de olhar) para sair do neutro.",
  amigavel_nao_marcante:
    "Voce e recebido(a) como simpatico(a), mas nao como opcao. A assinatura visual e o ritmo de entrada no ambiente precisam de mais intencao.",
  intimidante_distante:
    "Leitura inicial: distante ou dificil de ler. Abra o corpo, reduza barreiras (fone, bracos cruzados) e use primeira frase clara.",
  confuso:
    "Sinais mistos na primeira impressao: ajuste postura + roupa para uma mensagem unica — 'confiante e acolhedor' ou 'elegante e direto', mas nao os dois brigando.",
};

function sevenDayPlan(archetypeId: string, a: QuizAnswers): string[] {
  const focus =
    a.q11_bloqueioAtual === "estilo"
      ? "estilo"
      : a.q11_bloqueioAtual === "confianca"
        ? "postura"
        : a.q11_bloqueioAtual === "fotos_redes"
          ? "fotos"
          : "rotina";
  const base = [
    `Dia 1: diagnostico no espelho — anote 3 fricoes visuais ligadas a ${focus}.`,
    "Dia 2: escolha do outfit-base (capsula) e foto de corpo inteiro com luz natural.",
    "Dia 3: grooming profundo (corte/barba/pele) e alinhamento de sobrancelhas se aplicavel.",
    "Dia 4: postura — 5 minutos 3x ao dia ombros + pescoco.",
    "Dia 5: foto de rosto guia + atualizacao de perfil principal.",
    "Dia 6: uma saida social curta com roupa 'intencional' e observacao de retorno.",
    "Dia 7: revisao — o que repetir nas proximas 2 semanas.",
  ];
  if (archetypeId === "imagem_inconsistente")
    base[0] =
      "Dia 1: checklist matinal de 7 minutos (cabelo, roupa, pele) — mesma ordem todos os dias.";
  if (archetypeId === "intensidade_desalinhada")
    base[1] =
      "Dia 2: alinhar roupa ao tom da sua energia (mais estrutura ou mais leveza, nao os dois ao mesmo tempo).";
  return base;
}

function simulation(
  score: ScoreResult,
  seed: string,
): { projected: number; pct: number; body: string } {
  const h = stableHash(seed + score.notaFinal.toFixed(1));
  const delta = 0.8 + (h % 100) / 100; // 0.8 .. 1.79
  const projected = Math.min(8.9, Math.round((score.notaFinal + delta) * 10) / 10);
  const pct = 15 + (h % 31); // 15-45
  const body = `Projecao conservadora: sua nota pode subir de ${score.notaFinal.toFixed(1)} para cerca de ${projected.toFixed(1)} nas proximas semanas com os ajustes prioritarios. Estimativa de ganho de impacto social/atracao percebida: +${pct}% (referencia comportamental, nao garantia).`;
  return { projected, pct, body };
}

export function buildHeadlineSummary(score: ScoreResult, answers: QuizAnswers): string {
  const obj = answers.q03_objetivoAtual;
  const objLabel =
    obj === "relacionamento_serio"
      ? "relacionamento"
      : obj === "conhecer_pessoas"
        ? "encontrar pessoas"
        : obj === "autoconfianca"
          ? "autoconfianca"
          : obj === "poder_social"
            ? "presenca social"
            : "seu foco atual";
  return `Seu Nivel de Aparencia hoje e ${score.notaFinal.toFixed(1)}/10 — leitura integrada dos pilares estilo, simetria e presenca, alinhada ao seu objetivo de ${objLabel}. Abaixo, o que isso significa na pratica e o que priorizar.`;
}

export function buildResultReport(
  answers: QuizAnswers,
  score: ScoreResult,
  planCode: "basico" | "completo",
  answersComplete: boolean,
): BuiltResultReport {
  const pillars: PillarBlock[] = [
    {
      key: "estilo",
      title: "Estilo",
      scoreLabel: `${score.estiloScore.toFixed(1)} / 10`,
      body: answersComplete
        ? estiloParagraph(answers, score.estiloScore)
        : `Componente de estilo integrado na nota global: ${score.estiloScore.toFixed(1)}/10 (detalhamento limitado porque o questionario chegou incompleto no relatorio).`,
    },
    {
      key: "simetria",
      title: "Simetria e leitura em foto",
      scoreLabel: `${score.simetriaScore.toFixed(1)} / 10`,
      body: answersComplete
        ? simetriaParagraph(answers, score.simetriaScore)
        : `Leitura em foto/sim percepcao: ${score.simetriaScore.toFixed(1)}/10 — use o questionario completo na proxima vez para um raio-x mais fino.`,
    },
    {
      key: "presenca",
      title: "Presenca",
      scoreLabel: `${score.presencaScore.toFixed(1)} / 10`,
      body: answersComplete
        ? presencaParagraph(answers, score.presencaScore)
        : `Presenca agregada na nota: ${score.presencaScore.toFixed(1)}/10.`,
    },
  ];

  const practicalTips = answersComplete
    ? pickPracticalTips(answers, score.archetype.id, 5)
    : planCode === "completo"
      ? [
          "Hidratacao e sono regulares elevam pele e expressao em poucos dias.",
          "Escolha uma foto de rosto com luz natural como referencia unica em todos os apps.",
          "Uma peca com bom caimento vale mais que tres pecas medias.",
          "Postura: ombros leves para tras ao caminhar 2 minutos antes de entrar em qualquer ambiente.",
          "Revise legendas e bio: uma linha honesta sobre o que busca reduz sinais mistos.",
        ]
      : [];

  const headlineSummary = buildHeadlineSummary(score, answers);

  let completo: CompletoExtras | null = null;
  if (planCode === "completo") {
    const blockKey = answers.q11_bloqueioAtual ?? "estilo";
    const block = BLOCKING_COPY[blockKey] ?? BLOCKING_COPY.estilo;
    const fiKey = answers.q09_primeiroContato ?? "educado_neutro";
    const sim = simulation(score, score.archetype.id);
    completo = {
      archetypeTitle: score.archetype.name,
      archetypeDeep: ARCHETYPE_DEEP[score.archetype.id] ?? ARCHETYPE_DEEP.presenca_neutra,
      blockingTitle: block.title,
      blockingBody: block.body,
      sevenDayPlan: sevenDayPlan(score.archetype.id, answers),
      firstImpressionTitle: "Como voce e lido(a) no primeiro contato",
      firstImpressionBody: FIRST_IMPRESSION[fiKey] ?? FIRST_IMPRESSION.educado_neutro,
      simulationTitle: "Simulacao de impacto apos ajustes",
      simulationBody: sim.body,
      projectedNote: sim.projected,
      attractionLiftPercent: sim.pct,
    };
  }

  return {
    headlineSummary,
    pillars,
    practicalTips,
    completo,
  };
}
