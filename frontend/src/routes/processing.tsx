import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuiz } from "@/contexts/QuizContext";

export const Route = createFileRoute("/processing")({
  component: ProcessingPage,
});

const MESSAGES = [
  "Analisando padrao de presenca...",
  "Comparando seu estilo com seu objetivo...",
  "Lendo simetria e expressao...",
  "Montando seu perfil de atracao...",
  "Calculando sua nota real...",
];

function ProcessingPage() {
  const navigate = useNavigate();
  const { setLastPath } = useQuiz();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setLastPath("/processing");
  }, [setLastPath]);

  useEffect(() => {
    const interval = setInterval(() => setIdx((i) => (i + 1) % MESSAGES.length), 1500);
    const timeout = setTimeout(() => navigate({ to: "/result" }), 7000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center animate-fade-in">
        {/* Animated rings */}
        <div className="relative h-32 w-32 mx-auto mb-10">
          <div className="absolute inset-0 rounded-full border border-blood/20 animate-ping" style={{ animationDuration: "2s" }} />
          <div className="absolute inset-2 rounded-full border border-blood/40 animate-ping" style={{ animationDuration: "2.5s", animationDelay: "0.3s" }} />
          <div className="absolute inset-4 rounded-full border-2 border-blood animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-2xl text-gradient-blood">N7</span>
          </div>
        </div>

        <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">
          Gerando seu diagnostico
        </div>
        <p key={idx} className="text-lg text-foreground font-medium animate-fade-in min-h-[1.75rem]">
          {MESSAGES[idx]}
        </p>

        <div className="mt-8 h-[2px] w-full bg-border/40 overflow-hidden rounded-full">
          <div className="h-full bg-gradient-blood animate-shimmer" style={{ width: "100%" }} />
        </div>
      </div>
    </div>
  );
}
