const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers ?? {}),
  };
  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "request_failed");
  }
  return (await res.json()) as T;
}

export async function createLead(payload: {
  name: string;
  email: string;
  source?: string;
  consent?: boolean;
}) {
  return request<{ id: string; email: string; name: string }>("/leads", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createQuizSession(payload: {
  leadId: string;
  answers: Record<string, string>;
  score?: number;
  archetype?: string;
}) {
  return request<{ id: string }>("/quiz-sessions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createOrder(payload: {
  quizSessionId: string;
  planCode: "basico" | "completo";
}) {
  return request<{ orderId: string; status: string; amountCents: number; planCode: string }>(
    "/orders",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export type OrderPaymentStatus = {
  orderId: string;
  status: string;
  paidAt: string | null;
  canAccessResults: boolean;
  amountCents: number;
  planName: string;
  customer: { name: string; email: string };
  pixReady?: boolean;
  pixError?: string | null;
  pix: { qrCode: string | null; pixCopyPaste: string | null } | null;
};

export async function getOrderPaymentStatus(orderId: string) {
  return request<OrderPaymentStatus>(`/payments/${orderId}/status`);
}

/** Aguarda PIX (QR ou copia-e-cola) ficar disponivel antes de ir ao checkout; nao bloqueia para sempre. */
export async function waitForOrderPixReady(
  orderId: string,
  options?: { timeoutMs?: number; intervalMs?: number },
): Promise<OrderPaymentStatus> {
  const timeoutMs = options?.timeoutMs ?? 18_000;
  const intervalMs = options?.intervalMs ?? 700;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const data = await getOrderPaymentStatus(orderId);
    const ready = Boolean(data.pixReady || data.pix?.pixCopyPaste || data.pix?.qrCode);
    if (ready) return data;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return getOrderPaymentStatus(orderId);
}

export async function getMetaPixelSettings() {
  return request<{
    enabled: boolean;
    metaPixelId: string;
    metaTestEventCode: string | null;
  }>("/pixel/meta");
}

export type PublicPlanRow = {
  id: string;
  code: "basico" | "completo";
  name: string;
  priceCents: number;
};

export async function getPublicPlans() {
  return request<PublicPlanRow[]>("/plans");
}

let publicPlansCache: PublicPlanRow[] | null = null;
let publicPlansInflight: Promise<PublicPlanRow[]> | null = null;

export function getPublicPlansSnapshot(): PublicPlanRow[] | null {
  return publicPlansCache;
}

/** Um fetch por sessao; use no QuizProvider para prefetch e na oferta para evitar flash de preco. */
export async function ensurePublicPlansLoaded(): Promise<PublicPlanRow[]> {
  if (publicPlansCache) return publicPlansCache;
  if (publicPlansInflight) return publicPlansInflight;
  publicPlansInflight = getPublicPlans()
    .then((rows) => {
      publicPlansCache = rows;
      publicPlansInflight = null;
      return rows;
    })
    .catch((e) => {
      publicPlansInflight = null;
      throw e;
    });
  return publicPlansInflight;
}

export type ResultAccessPlan = {
  id: string;
  code: "basico" | "completo";
  name: string;
  priceCents: number;
};

export async function consumeResultAccessToken(token: string) {
  return request<{
    orderId: string;
    paidAt: string | null;
    quizSessionId: string;
    leadId: string;
    plan: ResultAccessPlan;
    lead: { name: string; email: string };
    result: { answers: Record<string, string>; score: number | null; archetype: string | null };
  }>("/results/access", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}
