import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuiz } from "@/contexts/QuizContext";

export const Route = createFileRoute("/confirmacao")({
  component: ConfirmationPage,
});

function ConfirmationPage() {
  const { lead, reset, setLastPath } = useQuiz();

  useEffect(() => {
    setLastPath("/confirmacao");
  }, [setLastPath]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-lg w-full text-center animate-slide-up">
        <div className="h-20 w-20 mx-auto mb-8 rounded-full bg-gradient-blood flex items-center justify-center glow-blood">
          <svg className="h-10 w-10 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="font-display text-4xl md:text-5xl mb-4">
          Perfeito{lead?.nome ? `, ${lead.nome}` : ""}.
        </h1>
        <p className="text-muted-foreground text-lg mb-2">
          Seu resultado foi preparado e enviado para
        </p>
        <p className="font-medium text-blood mb-8">{lead?.email ?? "seu email"}</p>

        <div className="rounded-xl border border-border bg-surface/60 p-6 mb-8 text-left">
          <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3">Proximo passo</div>
          <p className="text-sm text-foreground/85 leading-relaxed">
            Verifique sua caixa de entrada nos proximos minutos. No email voce encontra seu link de desbloqueio e o relatorio completo.
          </p>
        </div>

        <Link
          to="/"
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-border text-foreground hover:border-blood-subtle hover:bg-surface transition-all text-sm"
        >
          Voltar ao inicio
        </Link>
      </div>
    </div>
  );
}
