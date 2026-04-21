import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuiz } from "@/contexts/QuizContext";
import { UPGRADE_CHECKOUT_STORAGE_KEY } from "@/lib/result-report";
import { calculateScore } from "@/lib/scoring";
import { createLead, createOrder, createQuizSession } from "@/lib/public-api";

export const Route = createFileRoute("/oferta")({
  component: OfferPage,
  validateSearch: (search: Record<string, unknown>) => ({
    focus: search.focus === "completo" ? ("completo" as const) : undefined,
  }),
});

const PLANS = [
  {
    id: "basico",
    name: "Nivel de Aparencia",
    tagline: "Produto principal",
    price: "R$ 27",
    cta: "Quero meu Nivel de Aparencia",
    features: [
      "Nota geral com explicacao",
      "Analise estilo, simetria e presenca",
      "Top 5 melhorias praticas",
    ],
    highlight: true,
  },
  {
    id: "completo",
    name: "Poder de Atracao",
    tagline: "Upgrade avancado",
    price: "R$ 47",
    cta: "Quero meu plano completo",
    features: [
      "Tudo do plano basico",
      "Perfil de atracao (arquetipo completo)",
      "Bloqueios de atracao personalizados",
      "Plano de 7 dias passo a passo",
      "Como voce e lido(a) no primeiro contato",
      "Simulacao de evolucao apos ajustes",
    ],
    highlight: false,
  },
];

function OfferPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const focusCompleto = search.focus === "completo";
  const { answers, lead, leadId, setLead, setLeadId, quizSessionId, setQuizSessionId, setCheckoutOrderId, setLastPath } = useQuiz();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLastPath("/oferta");
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem(UPGRADE_CHECKOUT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        quizSessionId: string;
        leadId: string;
        lead: { nome: string; email: string };
      };
      sessionStorage.removeItem(UPGRADE_CHECKOUT_STORAGE_KEY);
      setLead(parsed.lead);
      setLeadId(parsed.leadId);
      setQuizSessionId(parsed.quizSessionId);
    } catch {
      // ignore bad JSON
    }
  }, [setLastPath, setLead, setLeadId, setQuizSessionId]);

  useEffect(() => {
    if (!focusCompleto) return;
    const id = window.setTimeout(() => {
      document.getElementById("plan-completo")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
    return () => window.clearTimeout(id);
  }, [focusCompleto]);

  async function startCheckout(planCode: "basico" | "completo") {
    if (!lead) {
      setError("Complete o quiz e informe seu email antes de continuar.");
      return;
    }

    setError(null);
    setLoadingPlan(planCode);
    try {
      let currentLeadId = leadId;
      if (!currentLeadId) {
        const createdLead = await createLead({ name: lead.nome, email: lead.email, consent: true, source: "quiz" });
        currentLeadId = createdLead.id;
        setLeadId(createdLead.id);
      }

      let currentQuizSessionId = quizSessionId;
      if (!currentQuizSessionId) {
        const score = calculateScore(answers);
        const session = await createQuizSession({
          leadId: currentLeadId,
          answers,
          score: score.notaFinal,
          archetype: score.archetype.id,
        });
        currentQuizSessionId = session.id;
        setQuizSessionId(session.id);
      }

      const order = await createOrder({ quizSessionId: currentQuizSessionId, planCode });
      setCheckoutOrderId(order.orderId);
      setLastPath(`/checkout/${order.orderId}`);
      await navigate({ to: "/checkout/$orderId", params: { orderId: order.orderId } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao iniciar checkout.");
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div className="min-h-screen flex flex-col px-6 md:px-10 py-10">
      <header className="flex items-center justify-between mb-10 max-w-5xl mx-auto w-full">
        <div className="font-display text-lg">
          Nivel<span className="text-gradient-blood">7</span>
        </div>
        <button
          onClick={() => navigate({ to: "/result" })}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Voltar
        </button>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full animate-slide-up">
        <div className="text-center mb-12">
          <div className="text-xs uppercase tracking-[0.25em] text-blood mb-4">Escolha seu desbloqueio</div>
          <h1 className="font-display text-4xl md:text-5xl leading-tight mb-4">
            Voce ja viu o <span className="italic">spoiler</span>.<br />
            Agora veja o <span className="text-gradient-blood">jogo completo</span>.
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Comece pelo seu Nivel de Aparencia e depois desbloqueie o upgrade completo se quiser aprofundar.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {PLANS.map((plan) => {
            const featured = focusCompleto ? plan.id === "completo" : plan.id === "basico";
            return (
            <div
              key={plan.id}
              id={plan.id === "completo" ? "plan-completo" : "plan-basico"}
              className={`relative rounded-2xl p-8 border transition-all ${
                featured
                  ? "border-blood bg-surface-elevated glow-blood"
                  : "border-border bg-surface/60"
              }`}
            >
              {featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-blood text-primary-foreground text-xs uppercase tracking-[0.2em] font-medium">
                  {focusCompleto ? "Upgrade recomendado" : "Produto principal"}
                </div>
              )}

              <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-2">
                {plan.tagline}
              </div>
              <h3 className="font-display text-2xl mb-4">{plan.name}</h3>
              <div className="flex items-baseline gap-2 mb-6 pb-6 border-b border-border">
                <span className="font-display text-4xl">{plan.price}</span>
                <span className="text-sm text-muted-foreground">unico</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <svg className={`h-4 w-4 mt-0.5 shrink-0 ${featured ? "text-blood" : "text-foreground/60"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className={featured ? "text-foreground" : "text-foreground/80"}>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => startCheckout(plan.id as "basico" | "completo")}
                disabled={loadingPlan !== null}
                className={`w-full py-4 rounded-full font-medium tracking-wide transition-all ${
                  featured
                    ? "bg-gradient-blood text-primary-foreground glow-blood hover:opacity-95"
                    : "border border-border text-foreground hover:bg-surface-elevated hover:border-blood-subtle"
                } ${loadingPlan !== null ? "opacity-70 cursor-not-allowed" : ""}`}
              >
                {loadingPlan === plan.id ? "Gerando checkout..." : plan.cta}
              </button>
            </div>
            );
          })}
        </div>

        {error && <p className="text-sm text-destructive text-center mt-6">{error}</p>}

        <p className="text-xs text-muted-foreground/60 text-center mt-10">
          Pagamento unico. Sem assinatura. Acesso vinculado ao seu email.
        </p>
      </main>
    </div>
  );
}
