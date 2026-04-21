/**
 * Chaves usadas pelo calculo de score (alinhado com frontend/src/lib/scoring.ts QUIZ_SCORE_REQUIRED_KEYS).
 * Sessao deve estar completa antes do checkout.
 */
export const QUIZ_ANSWERS_REQUIRED_KEYS = [
  'q04_estiloAtual',
  'q05_aparenciaFotos',
  'q06_frequenciaCuidado',
  'q07_roupaDiaADia',
  'q08_posturaExpressao',
  'q09_primeiroContato',
  'q10_chamaAtencao',
  'q13_tempoMelhora',
  'q14_disposicaoAjustar'
] as const;

export function validateQuizAnswersComplete(answers: unknown): string | null {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return 'answers_not_object';
  }
  const rec = answers as Record<string, unknown>;
  for (const key of QUIZ_ANSWERS_REQUIRED_KEYS) {
    const v = rec[key];
    if (v === undefined || v === null) return `missing_answer:${key}`;
    if (typeof v === 'string' && !v.trim()) return `empty_answer:${key}`;
    if (typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean') {
      return `invalid_answer:${key}`;
    }
  }
  return null;
}
