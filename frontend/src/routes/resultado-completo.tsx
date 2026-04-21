import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuiz } from "@/contexts/QuizContext";
import type { QuizAnswers } from "@/contexts/QuizContext";
import { consumeResultAccessToken, createOrder } from "@/lib/public-api";
import { buildResultReport } from "@/lib/result-report";
import {
  calculateScore,
  quizAnswersLookComplete,
  scoreResultFromStoredApi,
  type ScoreResult,
} from "@/lib/scoring";

export const Route = createFileRoute("/resultado-completo")({
  component: FullResultPage,
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
});

function FullResultPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const { setLead, setLeadId, setQuizSessionId, setCheckoutOrderId, setLastPath } = useQuiz();
  const [loading, setLoading] = useState(true);
  const [upgradeBusy, setUpgradeBusy] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    orderId: string;
    quizSessionId: string;
    leadId: string;
    lead: { name: string; email: string };
    result: { answers: Record<string, string> };
    planCode: "basico" | "completo";
    planName: string;
    score: ScoreResult;
    answersComplete: boolean;
  } | null>(null);

  useEffect(() => {
    async function load() {
      if (!token) {
        setError("Token de acesso ausente.");
        setLoading(false);
        return;
      }
      try {
        const response = await consumeResultAccessToken(token);
        const answers = (response.result.answers ?? {}) as QuizAnswers;
        const answersComplete = quizAnswersLookComplete(answers);
        let score: ScoreResult;
        if (answersComplete) {
          score = calculateScore(answers);
        } else if (response.result.score != null && response.result.archetype) {
          score = scoreResultFromStoredApi(response.result.score, response.result.archetype);
        } else {
          score = calculateScore(answers);
        }
        const code = response.plan.code === "completo" ? "completo" : "basico";
        setData({
          orderId: response.orderId,
          quizSessionId: response.quizSessionId,
          leadId: response.leadId,
          lead: response.lead,
          result: { answers },
          planCode: code,
          planName: response.plan.name,
          score,
          answersComplete,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Link invalido ou expirado.";
        if (message.includes("token_already_used")) {
          setError(
            "Este link ja nao e valido. Solicite um novo envio pelo painel ou pelo suporte.",
          );
        } else if (message.includes("token_expired")) {
          setError("Seu link expirou. Solicite um novo envio para acessar o resultado.");
        } else if (message.includes("token_revoked")) {
          setError("Este link foi revogado por seguranca.");
        } else if (message.includes("invalid_token")) {
          setError("Link invalido. Confira se o URL foi copiado corretamente.");
        } else {
          setError("Nao foi possivel validar o link de acesso.");
        }
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [token]);

  const report = useMemo(() => {
    if (!data) return null;
    return buildResultReport(
      data.result.answers as QuizAnswers,
      data.score,
      data.planCode,
      data.answersComplete,
    );
  }, [data]);

  async function goUpgradeCompleto() {
    if (!data) return;
    setUpgradeError(null);
    setUpgradeBusy(true);
    try {
      setLead({ nome: data.lead.name, email: data.lead.email });
      setLeadId(data.leadId);
      setQuizSessionId(data.quizSessionId);
      const order = await createOrder({ quizSessionId: data.quizSessionId, planCode: "completo" });
      setCheckoutOrderId(order.orderId);
      setLastPath(`/checkout/${order.orderId}`);
      await navigate({ to: "/checkout/$orderId", params: { orderId: order.orderId } });
    } catch (e) {
      setUpgradeError(e instanceof Error ? e.message : "Nao foi possivel iniciar o checkout.");
    } finally {
      setUpgradeBusy(false);
    }
  }

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">Carregando resultado...</div>
    );
  if (error || !data || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-lg text-center">
          <h1 className="font-display text-4xl mb-3">Acesso indisponivel</h1>
          <p className="text-muted-foreground mb-6">
            {error ?? "Nao foi possivel abrir seu resultado."}
          </p>
          <Link to="/" className="inline-flex px-6 py-3 rounded-full border border-border">
            Voltar ao inicio
          </Link>
        </div>
      </div>
    );
  }

  const isBasico = data.planCode === "basico";
  const isCompleto = data.planCode === "completo";

  return (
    <div className="min-h-screen px-6 py-10">
      <main className="max-w-3xl mx-auto">
        <div className="text-xs uppercase tracking-[0.25em] text-blood mb-3">{data.planName}</div>
        <h1 className="font-display text-4xl md:text-5xl mb-4">
          {data.lead.name}, seu {isCompleto ? "Poder de Atracao completo" : "Nivel de Aparencia"}{" "}
          foi desbloqueado.
        </h1>
        <p className="text-muted-foreground mb-8">
          {isCompleto
            ? "Relatorio completo com perfil de atracao, bloqueios, plano em 7 dias e simulacao de evolucao."
            : "Relatorio do plano basico: nota, pilares e cinco melhorias praticas priorizadas."}
        </p>

        {!data.answersComplete && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 mb-8">
            {isBasico
              ? "Algumas respostas do quiz nao estavam disponiveis neste relatorio — mostramos a nota e um resumo seguro. As dicas detalhadas em lista aparecem quando o questionario esta completo."
              : "Questionario incompleto no armazenamento: mostramos nota, arquetipo e secoes completas com dicas genericas de apoio ate voce refazer o fluxo com todas as perguntas."}
          </div>
        )}

        <div className="rounded-2xl border border-blood-subtle bg-surface p-8 mb-8">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
            Nivel de Aparencia
          </div>
          <div className="font-display text-7xl text-gradient-blood">
            {data.score.notaFinal.toFixed(1)} / 10
          </div>
          <p className="mt-6 text-foreground/85 leading-relaxed">{report.headlineSummary}</p>
        </div>

        <section className="mb-8">
          <h2 className="font-display text-2xl mb-4">Tres pilares</h2>
          <div className="space-y-4">
            {report.pillars.map((p) => (
              <div key={p.key} className="rounded-2xl border border-border p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                  <div className="text-xs uppercase tracking-[0.2em] text-blood">{p.title}</div>
                  <div className="font-display text-xl text-muted-foreground">{p.scoreLabel}</div>
                </div>
                <p className="text-foreground/80 text-sm leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {report.practicalTips.length > 0 && (
          <section className="rounded-2xl border border-border p-6 mb-8">
            <h2 className="font-display text-2xl mb-2">Top 5 melhorias praticas</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Priorize nesta ordem nos proximos 7 dias.
            </p>
            <ol className="list-decimal pl-5 space-y-3 text-foreground/85 text-sm">
              {report.practicalTips.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ol>
          </section>
        )}

        {isCompleto && report.completo && (
          <>
            <section className="rounded-2xl border border-blood-subtle bg-surface/40 p-6 mb-8">
              <div className="text-xs uppercase tracking-[0.2em] text-blood mb-2">
                Perfil de atracao
              </div>
              <h2 className="font-display text-3xl mb-2">{report.completo.archetypeTitle}</h2>
              <p className="text-foreground/80 mb-4">{data.score.insight}</p>
              <p className="text-foreground/75 text-sm leading-relaxed">
                {report.completo.archetypeDeep}
              </p>
            </section>

            <section className="rounded-2xl border border-border p-6 mb-8">
              <h2 className="font-display text-xl mb-2">{report.completo.blockingTitle}</h2>
              <p className="text-foreground/80 text-sm leading-relaxed">
                {report.completo.blockingBody}
              </p>
            </section>

            <section className="rounded-2xl border border-border p-6 mb-8">
              <h2 className="font-display text-xl mb-3">Plano de atracao em 7 dias</h2>
              <ol className="list-decimal pl-5 space-y-2 text-sm text-foreground/85">
                {report.completo.sevenDayPlan.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ol>
            </section>

            <section className="rounded-2xl border border-border p-6 mb-8">
              <h2 className="font-display text-xl mb-2">{report.completo.firstImpressionTitle}</h2>
              <p className="text-foreground/80 text-sm leading-relaxed">
                {report.completo.firstImpressionBody}
              </p>
            </section>

            <section className="rounded-2xl border border-blood-subtle p-6 mb-8">
              <h2 className="font-display text-xl mb-2">{report.completo.simulationTitle}</h2>
              <p className="text-foreground/80 text-sm leading-relaxed mb-2">
                {report.completo.simulationBody}
              </p>
              <p className="text-xs text-muted-foreground">
                Projecao de nota: ate {report.completo.projectedNote.toFixed(1)}/10 · referencia de
                impacto percebido +{report.completo.attractionLiftPercent}%.
              </p>
            </section>
          </>
        )}

        {isBasico && (
          <section className="rounded-2xl border border-blood-subtle bg-surface/50 p-8 text-center">
            <h2 className="font-display text-2xl mb-2">Quer o nivel completo?</h2>
            <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
              Desbloqueie o plano <strong className="text-foreground">Poder de Atracao</strong>:
              arquetipo expandido, bloqueios, plano em 7 dias, leitura do primeiro contato e
              simulacao de evolucao — alinhado ao que prometemos na oferta.
            </p>
            {upgradeError && (
              <p className="text-sm text-destructive mb-4 max-w-md mx-auto">{upgradeError}</p>
            )}
            <button
              type="button"
              disabled={upgradeBusy}
              onClick={() => void goUpgradeCompleto()}
              className="inline-flex px-8 py-3 rounded-full bg-gradient-blood text-primary-foreground font-medium tracking-wide disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {upgradeBusy ? "A preparar checkout…" : "Quero o Poder de Atracao completo"}
            </button>
          </section>
        )}

        <p className="text-center text-xs text-muted-foreground mt-10">
          Pedido {data.orderId.slice(0, 8)}… · {data.planName}
        </p>
      </main>
    </div>
  );
}
