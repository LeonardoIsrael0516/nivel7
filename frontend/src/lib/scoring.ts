import type { QuizAnswers } from "@/contexts/QuizContext";

/** Manter alinhado com backend/src/lib/quiz-answers.ts */
export const QUIZ_SCORE_REQUIRED_KEYS = [
  "q04_estiloAtual",
  "q05_aparenciaFotos",
  "q06_frequenciaCuidado",
  "q07_roupaDiaADia",
  "q08_posturaExpressao",
  "q09_primeiroContato",
  "q10_chamaAtencao",
  "q13_tempoMelhora",
  "q14_disposicaoAjustar",
] as const;

export function quizAnswersLookComplete(answers: QuizAnswers): boolean {
  return QUIZ_SCORE_REQUIRED_KEYS.every((k) => {
    const v = answers[k];
    return v != null && String(v).trim() !== "";
  });
}

const STYLE_MAP: Record<string, number> = {
  muito_bom: 8.2,
  bom: 7.2,
  medio: 6.2,
  fraco: 5.6,
  muito_fraco: 5.1,
};
const PRESENCE_MAP: Record<string, number> = {
  confianca: 8.0,
  neutralidade: 6.4,
  inseguranca: 5.4,
};
const SYMMETRY_MAP: Record<string, number> = {
  muito_bem: 7.8,
  bem: 7.1,
  ok: 6.4,
  mal: 5.8,
  muito_mal: 5.3,
};

export type ScoreResult = {
  notaFinal: number;
  estiloScore: number;
  simetriaScore: number;
  presencaScore: number;
  archetype: { id: string; name: string };
  insight: string;
};

const ARCHETYPES = [
  {
    id: "atracao_silenciosa",
    name: "Atracao Silenciosa",
    insight:
      "Voce desperta interesse, mas nao fixa atencao. Falta uma assinatura visual que marque.",
  },
  {
    id: "potencial_negligenciado",
    name: "Potencial Negligenciado",
    insight:
      "Sua base e melhor do que voce mostra. Pequenos ajustes geram um salto desproporcional.",
  },
  {
    id: "presenca_neutra",
    name: "Presenca Neutra",
    insight:
      "Voce nao afasta, mas tambem nao marca. Sua imagem comunica neutralidade quando precisa comunicar intencao.",
  },
  {
    id: "intensidade_desalinhada",
    name: "Intensidade Desalinhada",
    insight: "Sua energia e forte, mas a leitura visual nao acompanha. Voce confunde quem te ve.",
  },
  {
    id: "imagem_inconsistente",
    name: "Imagem Inconsistente",
    insight: "Seu cuidado e irregular, e isso gera leitura confusa nos primeiros segundos.",
  },
];

export function calculateScore(answers: QuizAnswers): ScoreResult {
  const estiloScore = STYLE_MAP[answers.q04_estiloAtual] ?? 6.2;
  const simetriaScore = SYMMETRY_MAP[answers.q05_aparenciaFotos] ?? 6.4;
  let presencaScore = PRESENCE_MAP[answers.q08_posturaExpressao] ?? 6.4;

  // adjustments
  let estiloAdj = estiloScore;
  if (answers.q06_frequenciaCuidado === "baixa") {
    estiloAdj -= 0.4;
    presencaScore -= 0.2;
  }
  if (answers.q09_primeiroContato === "amigavel_nao_marcante") presencaScore -= 0.5;
  if (
    answers.q13_tempoMelhora === "7_dias" &&
    ["alta", "total"].includes(answers.q14_disposicaoAjustar)
  ) {
    presencaScore += 0.3;
  }

  let nota = estiloAdj * 0.35 + simetriaScore * 0.25 + presencaScore * 0.4;
  nota = Math.max(4.8, Math.min(8.9, nota));
  nota = Math.round(nota * 10) / 10;

  // archetype selection (simplified)
  let archetype = ARCHETYPES[2]; // default presenca neutra
  if (
    answers.q06_frequenciaCuidado === "baixa" &&
    ["aleatorio", "pratico_sem_estilo"].includes(answers.q07_roupaDiaADia)
  ) {
    archetype = ARCHETYPES[4];
  } else if (
    answers.q10_chamaAtencao === "sempre" &&
    ["intimidante_distante", "confuso"].includes(answers.q09_primeiroContato)
  ) {
    archetype = ARCHETYPES[3];
  } else if (estiloScore <= 6.0 && simetriaScore >= 6.4) {
    archetype = ARCHETYPES[1];
  } else if (
    presencaScore >= 6.0 &&
    presencaScore <= 7.0 &&
    ["educado_neutro", "amigavel_nao_marcante"].includes(answers.q09_primeiroContato)
  ) {
    archetype = ARCHETYPES[0];
  } else if (presencaScore < 6.0 && estiloScore >= 6.0 && estiloScore <= 7.0) {
    archetype = ARCHETYPES[2];
  }

  return {
    notaFinal: nota,
    estiloScore: Math.round(estiloAdj * 10) / 10,
    simetriaScore: Math.round(simetriaScore * 10) / 10,
    presencaScore: Math.round(presencaScore * 10) / 10,
    archetype: { id: archetype.id, name: archetype.name },
    insight: archetype.insight,
  };
}

export function getArchetypeById(id: string): { id: string; name: string; insight: string } {
  const a = ARCHETYPES.find((x) => x.id === id);
  if (a) return { id: a.id, name: a.name, insight: a.insight };
  return { id: ARCHETYPES[2].id, name: ARCHETYPES[2].name, insight: ARCHETYPES[2].insight };
}

/** Quando a API devolve nota/arquetipo persistidos mas answers incompletos no cliente. */
export function scoreResultFromStoredApi(notaFinal: number, archetypeId: string): ScoreResult {
  const a = getArchetypeById(archetypeId);
  const nota = Math.round(Math.max(4.8, Math.min(8.9, notaFinal)) * 10) / 10;
  const sub = nota;
  return {
    notaFinal: nota,
    estiloScore: sub,
    simetriaScore: sub,
    presencaScore: sub,
    archetype: { id: a.id, name: a.name },
    insight: a.insight,
  };
}
