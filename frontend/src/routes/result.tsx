import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useQuiz } from "@/contexts/QuizContext";
import { calculateScore } from "@/lib/scoring";

export const Route = createFileRoute("/result")({
  component: ResultPage,
});

function ResultPage() {
  const navigate = useNavigate();
  const { answers, lead, unlockedOrderId, setLastPath } = useQuiz();
  const result = useMemo(() => calculateScore(answers), [answers]);
  const isUnlocked = Boolean(unlockedOrderId);

  useEffect(() => {
    setLastPath("/result");
  }, [setLastPath]);

  return (
    <div className="min-h-screen flex flex-col px-6 md:px-10 py-10">
      <header className="flex items-center justify-between mb-12 max-w-3xl mx-auto w-full">
        <div className="font-display text-lg">
          Nivel<span className="text-gradient-blood">7</span>
        </div>
        <div className="text-xs uppercase tracking-[0.25em] text-blood">Resultado parcial</div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full animate-slide-up">
        <p className="text-sm text-muted-foreground mb-3">
          {lead?.nome ? `${lead.nome}, este e o seu spoiler.` : "Este e o seu spoiler."}
        </p>
        <h1 className="font-display text-4xl md:text-5xl leading-tight mb-10">
          Voce nao esta sendo ignorado(a) por <span className="italic text-gradient-blood">falta de beleza</span>.
        </h1>

        {/* Score Card */}
        <div className="rounded-2xl border border-blood-subtle bg-surface p-8 md:p-10 mb-6 glow-blood">
          <div className="flex items-baseline gap-4 mb-6">
            <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Sua nota parcial</div>
          </div>
          <div className="flex items-end gap-3 mb-8">
            <span className="font-display text-7xl md:text-8xl text-gradient-blood leading-none">
              {result.notaFinal.toFixed(1)}
            </span>
            <span className="font-display text-3xl text-muted-foreground mb-2">/10</span>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8 pb-8 border-b border-border">
            {[
              { label: "Estilo", val: result.estiloScore },
              { label: "Simetria", val: result.simetriaScore },
              { label: "Presenca", val: result.presencaScore },
            ].map((p) => (
              <div key={p.label}>
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">{p.label}</div>
                <div className="font-display text-2xl">{p.val.toFixed(1)}</div>
                <div className="mt-2 h-1 bg-border/50 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-blood" style={{ width: `${(p.val / 10) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-blood mb-2">Seu arquetipo</div>
              <div className="font-display text-2xl">{result.archetype.name}</div>
            </div>
            <p className="text-foreground/85 leading-relaxed text-lg italic">
              "{result.insight}"
            </p>
          </div>
        </div>

        {/* Locked sections */}
        <div className="space-y-3 mb-10">
          {[
            { label: "Seu Nivel de Aparencia completo", primary: true },
            { label: "Plano de atracao em 7 dias", primary: false },
            { label: "Como voce e lido(a) no primeiro contato", primary: false },
            { label: "Bloqueios emocionais e sociais especificos", primary: false },
            { label: "Simulacao de evolucao apos ajustes", primary: false },
          ].map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-4 p-5 rounded-xl border ${
                item.primary
                  ? "border-blood-subtle bg-surface glow-blood"
                  : "border-border bg-surface/40"
              }`}
            >
              <svg className="h-5 w-5 text-blood shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <div className="flex flex-col">
                <span className={item.primary ? "text-foreground font-medium" : "text-foreground/70"}>{item.label}</span>
                {item.primary && (
                  <span className="text-[10px] uppercase tracking-[0.2em] text-blood mt-1">Produto principal</span>
                )}
              </div>
              <span className="ml-auto text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {isUnlocked ? "Desbloqueado" : "Bloqueado"}
              </span>
            </div>
          ))}
        </div>

        {isUnlocked ? (
          <button
            onClick={() => navigate({ to: "/confirmacao" })}
            className="w-full py-5 rounded-full bg-gradient-blood text-primary-foreground font-medium text-lg tracking-wide hover:opacity-95 transition-all glow-blood"
          >
            Ver confirmacao e email de acesso
          </button>
        ) : (
          <button
            onClick={() => navigate({ to: "/oferta" })}
            className="w-full py-5 rounded-full bg-gradient-blood text-primary-foreground font-medium text-lg tracking-wide hover:opacity-95 transition-all glow-blood"
          >
            Desbloquear meu Nivel de Aparencia
          </button>
        )}
        <p className="text-xs text-muted-foreground/60 text-center mt-4">
          Relatorio gerado para seu momento atual. Recomendado desbloquear enquanto os dados estao frescos.
        </p>
      </main>
    </div>
  );
}
