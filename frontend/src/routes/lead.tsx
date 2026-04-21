import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuiz } from "@/contexts/QuizContext";
import { QuizShell } from "@/components/quiz/QuizShell";
import { LEAD_STEP, TOTAL_QUIZ_STEPS } from "@/lib/quiz-schema";

export const Route = createFileRoute("/lead")({
  component: LeadPage,
});

function LeadPage() {
  const navigate = useNavigate();
  const { setLead, setLastPath } = useQuiz();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) { setError("Digite seu nome"); return; }
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!ok) { setError("Digite um email valido"); return; }
    setError(null);
    setLead({ nome: nome.trim(), email: email.trim() });
    navigate({ to: "/quiz/$step", params: { step: String(LEAD_STEP + 1) } });
  };

  useEffect(() => {
    setLastPath("/lead");
  }, [setLastPath]);

  return (
    <QuizShell step={LEAD_STEP} total={TOTAL_QUIZ_STEPS}>
      <div>
        <div className="text-xs uppercase tracking-[0.25em] text-blood mb-4">
          Ultima etapa antes do resultado
        </div>
        <h1 className="font-display text-3xl md:text-4xl leading-tight mb-3">
          Seu resultado <span className="italic text-gradient-blood">personalizado</span> esta quase pronto.
        </h1>
        <p className="text-muted-foreground mb-10">
          Confirme seus dados para receber seu diagnostico e o link de desbloqueio.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Nome</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome"
              className="w-full px-5 py-4 rounded-xl bg-surface border border-border focus:border-blood focus:outline-none focus:ring-2 focus:ring-ring transition-all text-foreground placeholder:text-muted-foreground/60"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full px-5 py-4 rounded-xl bg-surface border border-border focus:border-blood focus:outline-none focus:ring-2 focus:ring-ring transition-all text-foreground placeholder:text-muted-foreground/60"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            className="w-full py-4 rounded-full bg-gradient-blood text-primary-foreground font-medium tracking-wide hover:opacity-95 transition-all glow-blood"
          >
            Continuar para finalizar analise
          </button>

          <p className="text-xs text-muted-foreground/70 text-center pt-2">
            Seus dados sao usados apenas para enviar seu diagnostico.
          </p>
        </form>
      </div>
    </QuizShell>
  );
}
