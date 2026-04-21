import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuiz } from "@/contexts/QuizContext";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  const navigate = useNavigate();
  const { isHydrated, lastPath, reset } = useQuiz();

  const showResumePrompt =
    isHydrated &&
    lastPath &&
    lastPath !== "/" &&
    !lastPath.startsWith("/resultado-completo");

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <header className="px-6 md:px-10 py-6 flex items-center justify-between">
        <div className="font-display text-xl tracking-tight">
          Nivel<span className="text-gradient-blood">7</span>
        </div>
        <div className="text-[10px] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.25em] text-muted-foreground text-right leading-tight max-w-[11rem] sm:max-w-none">
          Analise Brutal de Aparencia
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 md:px-10 text-center">
        {showResumePrompt && (
          <div className="w-full max-w-3xl mb-8 rounded-2xl border border-blood-subtle bg-surface/60 px-5 py-4 text-left animate-slide-up">
            <div className="text-sm font-medium text-foreground mb-1">Voce tem um diagnostico em andamento</div>
            <p className="text-xs text-muted-foreground mb-4">
              Continue de onde parou ou apague o progresso salvo neste aparelho e recomece o quiz do zero.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => void navigate({ to: lastPath as never })}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-full bg-gradient-blood text-primary-foreground text-sm font-medium"
              >
                Continuar de onde parei
              </button>
              <button
                type="button"
                onClick={() => reset()}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-full border border-border text-sm text-muted-foreground hover:text-foreground hover:border-blood-subtle transition-colors"
              >
                Resetar quiz e recomeçar
              </button>
            </div>
          </div>
        )}
        <div className="max-w-3xl animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blood-subtle bg-surface/50 backdrop-blur-sm mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-blood animate-shimmer" />
            <span className="text-xs uppercase tracking-[0.2em] text-foreground/80">
              Diagnostico em menos de 3 minutos
            </span>
          </div>

          <h1 className="font-display text-5xl md:text-7xl leading-[1.05] mb-6">
            Descubra <span className="italic text-gradient-blood">por que</span><br />
            voce nao atrai.
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            Uma analise brutalmente honesta da sua aparencia e do que esta reduzindo seu poder de atracao, com o que ajustar nos proximos 7 dias.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/quiz/$step"
              params={{ step: "1" }}
              className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-gradient-blood text-primary-foreground font-medium text-base tracking-wide hover:opacity-95 transition-all glow-blood"
            >
              Quero meu diagnostico
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>

          {/* Trust signals */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto">
            {[
              { label: "Personalizado", desc: "Unico para seu perfil" },
              { label: "Brutalmente honesto", desc: "Sem floreio, sem desrespeito" },
              { label: "Suas fotos privadas", desc: "Nunca publicas" },
            ].map((item) => (
              <div key={item.label} className="text-left p-5 rounded-xl border border-border/60 bg-surface/40 backdrop-blur-sm">
                <div className="text-sm font-medium text-foreground mb-1">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Como funciona */}
        <section id="como-funciona" className="mt-32 mb-20 max-w-4xl w-full">
          <div className="text-center mb-12">
            <div className="text-xs uppercase tracking-[0.25em] text-blood mb-3">Como funciona</div>
            <h2 className="font-display text-3xl md:text-4xl">Tres passos para sua leitura real</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { n: "01", t: "Responda o quiz", d: "14 perguntas curtas que mapeiam estilo, presenca e percepcao." },
              { n: "02", t: "Envie ate 3 fotos", d: "Calibracao visual com leitura de presenca e simetria." },
              { n: "03", t: "Receba seu diagnostico", d: "Nota real, arquetipo de atracao e plano de 7 dias." },
            ].map((s) => (
              <div key={s.n} className="p-7 rounded-2xl border border-border bg-surface/50 hover:border-blood-subtle transition-all">
                <div className="font-display text-3xl text-gradient-blood mb-4">{s.n}</div>
                <div className="font-medium mb-2">{s.t}</div>
                <div className="text-sm text-muted-foreground leading-relaxed">{s.d}</div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="px-6 md:px-10 py-8 text-center text-xs text-muted-foreground/60 border-t border-border/40">
        © Nivel7 — Voce nao precisa ficar mais bonito(a). Precisa ficar mais atraente.
      </footer>
    </div>
  );
}
