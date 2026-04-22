import { createContext, useContext, useState, type ReactNode } from "react";
import { useEffect } from "react";
import { clearQuizPhotos, loadQuizPhotos, saveQuizPhotos } from "@/lib/quiz-photo-storage";
import { ensurePublicPlansLoaded } from "@/lib/public-api";

export type QuizAnswers = Record<string, string>;

export type LeadData = { nome: string; email: string };

type QuizState = {
  answers: QuizAnswers;
  setAnswer: (questionId: string, optionId: string) => void;
  lead: LeadData | null;
  setLead: (lead: LeadData) => void;
  leadId: string | null;
  setLeadId: (leadId: string | null) => void;
  quizSessionId: string | null;
  setQuizSessionId: (quizSessionId: string | null) => void;
  checkoutOrderId: string | null;
  setCheckoutOrderId: (orderId: string | null) => void;
  unlockedOrderId: string | null;
  setUnlockedOrderId: (orderId: string | null) => void;
  lastPath: string | null;
  setLastPath: (path: string | null) => void;
  isHydrated: boolean;
  photos: string[]; // data URLs (preview only)
  setPhotos: (photos: string[]) => void;
  reset: () => void;
};

const QuizContext = createContext<QuizState | null>(null);
const STORAGE_KEY = "nivel7_quiz_state_v1";

function persistLightState(payload: {
  answers: QuizAnswers;
  lead: LeadData | null;
  leadId: string | null;
  quizSessionId: string | null;
  checkoutOrderId: string | null;
  unlockedOrderId: string | null;
  lastPath: string | null;
}) {
  const json = JSON.stringify(payload);
  try {
    localStorage.setItem(STORAGE_KEY, json);
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.setItem(STORAGE_KEY, json);
      } catch {
        // still too large; keep session in memory only
      }
    }
  }
}

export function QuizProvider({ children }: { children: ReactNode }) {
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [lead, setLead] = useState<LeadData | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [quizSessionId, setQuizSessionId] = useState<string | null>(null);
  const [checkoutOrderId, setCheckoutOrderId] = useState<string | null>(null);
  const [unlockedOrderId, setUnlockedOrderId] = useState<string | null>(null);
  const [lastPath, setLastPath] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);

  const setAnswer = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const reset = () => {
    setAnswers({});
    setLead(null);
    setLeadId(null);
    setQuizSessionId(null);
    setCheckoutOrderId(null);
    setUnlockedOrderId(null);
    setLastPath(null);
    setPhotos([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
      void clearQuizPhotos();
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    void (async () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          const fromIdb = await loadQuizPhotos();
          if (fromIdb.length) setPhotos(fromIdb);
          setIsHydrated(true);
          return;
        }
        const parsed = JSON.parse(raw) as {
          answers?: QuizAnswers;
          lead?: LeadData | null;
          leadId?: string | null;
          quizSessionId?: string | null;
          checkoutOrderId?: string | null;
          unlockedOrderId?: string | null;
          lastPath?: string | null;
          photos?: string[];
        };
        if (parsed.answers) setAnswers(parsed.answers);
        if (parsed.lead) setLead(parsed.lead);
        if (parsed.leadId) setLeadId(parsed.leadId);
        if (parsed.quizSessionId) setQuizSessionId(parsed.quizSessionId);
        if (parsed.checkoutOrderId) setCheckoutOrderId(parsed.checkoutOrderId);
        if (parsed.unlockedOrderId) setUnlockedOrderId(parsed.unlockedOrderId);
        if (parsed.lastPath) setLastPath(parsed.lastPath);

        const idbPhotos = await loadQuizPhotos();
        if (idbPhotos.length > 0) {
          setPhotos(idbPhotos);
        } else if (Array.isArray(parsed.photos) && parsed.photos.length > 0) {
          setPhotos(parsed.photos);
          await saveQuizPhotos(parsed.photos);
          persistLightState({
            answers: parsed.answers ?? {},
            lead: parsed.lead ?? null,
            leadId: parsed.leadId ?? null,
            quizSessionId: parsed.quizSessionId ?? null,
            checkoutOrderId: parsed.checkoutOrderId ?? null,
            unlockedOrderId: parsed.unlockedOrderId ?? null,
            lastPath: parsed.lastPath ?? null,
          });
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      } finally {
        setIsHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") return;
    persistLightState({
      answers,
      lead,
      leadId,
      quizSessionId,
      checkoutOrderId,
      unlockedOrderId,
      lastPath,
    });
  }, [
    answers,
    lead,
    leadId,
    quizSessionId,
    checkoutOrderId,
    unlockedOrderId,
    lastPath,
    isHydrated,
  ]);

  useEffect(() => {
    if (!isHydrated) return;
    void saveQuizPhotos(photos);
  }, [photos, isHydrated]);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") return;
    void ensurePublicPlansLoaded().catch(() => {
      // planos opcionais na primeira carga
    });
  }, [isHydrated]);

  return (
    <QuizContext.Provider
      value={{
        answers,
        setAnswer,
        lead,
        setLead,
        leadId,
        setLeadId,
        quizSessionId,
        setQuizSessionId,
        checkoutOrderId,
        setCheckoutOrderId,
        unlockedOrderId,
        setUnlockedOrderId,
        lastPath,
        setLastPath,
        isHydrated,
        photos,
        setPhotos,
        reset,
      }}
    >
      {children}
    </QuizContext.Provider>
  );
}

export function useQuiz() {
  const ctx = useContext(QuizContext);
  if (!ctx) throw new Error("useQuiz must be used within QuizProvider");
  return ctx;
}
