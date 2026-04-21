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

export async function getOrderPaymentStatus(orderId: string) {
  return request<{
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
  }>(`/payments/${orderId}/status`);
}

export async function getMetaPixelSettings() {
  return request<{
    enabled: boolean;
    metaPixelId: string;
    metaTestEventCode: string | null;
  }>("/pixel/meta");
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
