const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

function getToken() {
  return localStorage.getItem("admin_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers ?? undefined);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "request_failed");
  }
  return (await res.json()) as T;
}

export type AdminPlan = {
  id: string;
  code: string;
  name: string;
  priceCents: number;
  isActive: boolean;
};

export type AdminOrder = {
  id: string;
  status: string;
  amountCents: number;
  createdAt: string;
  plan: { name: string };
  quizSession: { lead: { email: string; name: string } };
  paymentTxs: Array<{ status: string }>;
};

export type AdminMetrics = {
  totalOrders: number;
  paidOrders: number;
  conversionRate: number;
  paidRevenueCents: number;
};

export type AdminEmailLog = {
  id: string;
  template: string;
  recipient: string;
  status: string;
  createdAt: string;
};

export type AdminPixelEvent = {
  id: string;
  eventName: string;
  status: string;
  createdAt: string;
};

export type AdminSettingsResponse = {
  cajuPay: { baseUrl: string; apiKeyMasked: string; apiSecretMasked: string };
  smtp: { host: string; port: number | string; user: string; passMasked: string; from: string };
  pixel: {
    provider: string;
    tokenMasked: string;
    enabled: boolean;
    metaPixelId: string;
    metaAccessTokenMasked: string;
    metaTestEventCode: string;
  };
};

export async function adminLogin(email: string, password: string) {
  const data = await request<{ token: string }>("/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem("admin_token", data.token);
  return data;
}

export async function getAdminPlans() {
  return request<AdminPlan[]>("/admin/plans");
}

export async function updateAdminPlan(
  id: string,
  payload: { name?: string; priceCents?: number; isActive?: boolean }
) {
  return request<AdminPlan>(`/admin/plans/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function getAdminOrders() {
  return request<AdminOrder[]>("/admin/orders");
}

export async function approveOrderPayment(orderId: string) {
  return request<{ ok: boolean; updated: boolean; status: string }>(`/admin/orders/${orderId}/approve-payment`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function resendOrderResultEmail(orderId: string) {
  return request<{ ok: true; enqueued: true }>(`/admin/orders/${orderId}/resend-result-email`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function getIntegrationStatus() {
  return request<{ smtpConfigured: boolean; cajuPayConfigured: boolean; pixelConfigured: boolean }>(
    "/admin/integrations/status"
  );
}

export async function triggerReconciliation() {
  return request<{ enqueued: boolean }>("/admin/jobs/reconcile-payments", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function getAdminMetrics() {
  return request<AdminMetrics>("/admin/metrics");
}

export async function getAdminEmailLogs() {
  return request<AdminEmailLog[]>("/admin/email-logs");
}

export async function getAdminPixelEvents() {
  return request<AdminPixelEvent[]>("/admin/pixel-events");
}

export async function getAdminSettings() {
  return request<AdminSettingsResponse>("/admin/settings");
}

export type SmtpTestEmailResponse = {
  ok: true;
  messageId: string | null;
  configuredFrom: string;
  effectiveFrom: string;
  accepted: string[];
  rejected: string[];
  smtpResponse: string | null;
};

export async function sendSmtpTestEmail(payload: {
  to: string;
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  from?: string;
}) {
  return request<SmtpTestEmailResponse>("/admin/smtp/test-email", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function saveAdminSettings(payload: {
  cajuPay?: { baseUrl?: string; apiKey?: string; apiSecret?: string };
  smtp?: { host?: string; port?: number; user?: string; pass?: string; from?: string };
  pixel?: {
    provider?: string;
    token?: string;
    enabled?: boolean;
    metaPixelId?: string;
    metaAccessToken?: string;
    metaTestEventCode?: string;
  };
}) {
  return request<{ ok: true }>("/admin/settings", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
