import { Link } from "@tanstack/react-router";
import { ProgressBar } from "./ProgressBar";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  step: number;
  total: number;
};

export function QuizShell({ children, step, total }: Props) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 md:px-10 py-6 flex items-center justify-between">
        <Link
          to="/"
          className="font-display text-lg tracking-tight text-foreground/90 hover:text-blood transition-colors"
        >
          Nivel<span className="text-gradient-blood">7</span>
        </Link>
        <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground hidden md:block">
          Diagnostico de Atracao
        </div>
      </header>

      <div className="px-6 md:px-10 max-w-2xl mx-auto w-full">
        <ProgressBar current={step} total={total} />
      </div>

      <main className="flex-1 flex items-center justify-center px-6 md:px-10 py-10">
        <div className="w-full max-w-2xl animate-slide-up">{children}</div>
      </main>

      <footer className="px-6 md:px-10 py-6 text-center text-xs text-muted-foreground/60">
        Nao existe resposta certa. Quanto mais sincero(a), mais preciso seu Nivel de Aparencia.
      </footer>
    </div>
  );
}
