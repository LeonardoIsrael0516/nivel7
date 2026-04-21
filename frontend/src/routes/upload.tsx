import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuiz } from "@/contexts/QuizContext";
import { QuizShell } from "@/components/quiz/QuizShell";
import { TOTAL_QUIZ_STEPS, UPLOAD_STEP } from "@/lib/quiz-schema";

export const Route = createFileRoute("/upload")({
  component: UploadPage,
});

function UploadPage() {
  const navigate = useNavigate();
  const { photos, setPhotos, setLastPath } = useQuiz();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).slice(0, 3 - photos.length);
    const readers = arr.map(
      (f) =>
        new Promise<string>((resolve) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.readAsDataURL(f);
        })
    );
    Promise.all(readers).then((urls) => {
      const next = [...photos, ...urls].slice(0, 3);
      setPhotos(next);
      setError(null);
    });
  };

  const removePhoto = (i: number) => {
    setPhotos(photos.filter((_, idx) => idx !== i));
  };

  const handleContinue = () => {
    if (photos.length < 1) {
      setError("Envie pelo menos 1 foto para calibrar seu diagnostico.");
      return;
    }
    navigate({ to: "/quiz/$step", params: { step: String(UPLOAD_STEP + 1) } });
  };

  useEffect(() => {
    setLastPath("/upload");
  }, [setLastPath]);

  return (
    <QuizShell step={UPLOAD_STEP} total={TOTAL_QUIZ_STEPS}>
      <div>
        <div className="text-xs uppercase tracking-[0.25em] text-blood mb-4">
          Etapa essencial do Nivel de Aparencia
        </div>
        <h1 className="font-display text-3xl md:text-4xl leading-tight mb-3">
          Envie ate 3 fotos para <span className="italic text-gradient-blood">calibrar</span> seu nivel real.
        </h1>
        <p className="text-muted-foreground mb-8">
          Esta etapa vem cedo porque sua leitura visual e a base do diagnostico. Minimo de 1 foto para continuar.
        </p>

        <ul className="space-y-2 mb-8 text-sm text-muted-foreground">
          {[
            "Rosto visivel e boa iluminacao",
            "Pelo menos um angulo frontal",
            "Se possivel, inclua uma foto de meio corpo",
          ].map((g) => (
            <li key={g} className="flex items-start gap-3">
              <span className="text-blood mt-1">·</span>
              <span>{g}</span>
            </li>
          ))}
        </ul>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[0, 1, 2].map((i) => {
            const url = photos[i];
            return (
              <div
                key={i}
                className="aspect-[3/4] rounded-xl border border-dashed border-border bg-surface/40 relative overflow-hidden flex items-center justify-center"
              >
                {url ? (
                  <>
                    <img src={url} alt={`foto ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/80 backdrop-blur text-foreground flex items-center justify-center hover:bg-background"
                      aria-label="Remover"
                    >
                      ×
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground/60">Foto {i + 1}</span>
                )}
              </div>
            );
          })}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={photos.length >= 3}
          className="w-full py-4 rounded-full border border-blood-subtle bg-surface hover:bg-surface-elevated transition-all text-foreground font-medium disabled:opacity-40 disabled:cursor-not-allowed mb-3"
        >
          {photos.length === 0 ? "Selecionar fotos" : photos.length >= 3 ? "Limite atingido (3)" : "Adicionar mais"}
        </button>

        {error && <p className="text-sm text-destructive mb-4 text-center">{error}</p>}

        <button
          onClick={handleContinue}
          className="w-full py-4 rounded-full bg-gradient-blood text-primary-foreground font-medium tracking-wide hover:opacity-95 transition-all glow-blood"
        >
          Continuar quiz
        </button>

        <p className="text-xs text-muted-foreground/60 text-center mt-4">
          Suas fotos sao privadas e usadas apenas na sua analise. Nunca tornadas publicas.
        </p>

        <div className="mt-5 text-center">
          <button
            onClick={() => navigate({ to: "/quiz/$step", params: { step: String(UPLOAD_STEP - 1) } })}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Voltar uma etapa
          </button>
        </div>
      </div>
    </QuizShell>
  );
}
