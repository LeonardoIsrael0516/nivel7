import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { LEAD_STEP, QUIZ_QUESTIONS, TOTAL_QUIZ_STEPS, UPLOAD_STEP } from "@/lib/quiz-schema";
import { useQuiz } from "@/contexts/QuizContext";
import { QuizShell } from "@/components/quiz/QuizShell";
import { QuizOption } from "@/components/quiz/QuizOption";

export const Route = createFileRoute("/quiz/$step")({
  component: QuizStepPage,
});

function QuizStepPage() {
  const { step } = Route.useParams();
  const navigate = useNavigate();
  const { answers, setAnswer, setLastPath } = useQuiz();
  const stepNum = parseInt(step, 10);

  const isUploadStep = stepNum === UPLOAD_STEP;
  const isLeadStep = stepNum === LEAD_STEP;

  useEffect(() => {
    if (isUploadStep) navigate({ to: "/upload" });
    if (isLeadStep) navigate({ to: "/lead" });
  }, [isUploadStep, isLeadStep, navigate]);

  useEffect(() => {
    setLastPath(`/quiz/${stepNum}`);
  }, [setLastPath, stepNum]);

  if (isUploadStep || isLeadStep) return null;

  let questionIndex = stepNum - 1;
  if (stepNum > UPLOAD_STEP) questionIndex -= 1;
  if (stepNum > LEAD_STEP) questionIndex -= 1;

  const question = QUIZ_QUESTIONS[questionIndex];

  if (!question) {
    return (
      <QuizShell step={stepNum} total={TOTAL_QUIZ_STEPS}>
        <div className="text-center">
          <p className="text-muted-foreground mb-6">Pergunta nao encontrada.</p>
          <Link to="/" className="text-blood underline">
            Voltar ao inicio
          </Link>
        </div>
      </QuizShell>
    );
  }

  const selected = answers[question.id];

  const handleSelect = (optionId: string) => {
    setAnswer(question.id, optionId);
    setTimeout(() => {
      const nextStep = stepNum + 1;
      if (questionIndex === QUIZ_QUESTIONS.length - 1) {
        navigate({ to: "/processing" });
      } else {
        navigate({ to: "/quiz/$step", params: { step: String(nextStep) } });
      }
    }, 250);
  };

  return (
    <QuizShell step={stepNum} total={TOTAL_QUIZ_STEPS}>
      <div>
        {stepNum <= 2 && (
          <p className="text-xs uppercase tracking-[0.2em] text-blood mb-4">
            Inicio rapido para calibrar seu Nivel de Aparencia
          </p>
        )}
        <h1 className="font-display text-3xl md:text-4xl leading-tight mb-10">{question.title}</h1>
        <div className="space-y-3">
          {question.options.map((opt, i) => (
            <QuizOption
              key={opt.id}
              label={opt.label}
              selected={selected === opt.id}
              onClick={() => handleSelect(opt.id)}
              index={i}
            />
          ))}
        </div>

        {stepNum > 1 && (
          <div className="mt-8 text-center">
            <button
              onClick={() => navigate({ to: "/quiz/$step", params: { step: String(stepNum - 1) } })}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Voltar
            </button>
          </div>
        )}
      </div>
    </QuizShell>
  );
}
