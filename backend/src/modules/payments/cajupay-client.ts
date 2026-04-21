import { env } from '../../env.js';
import { prisma } from '../../lib/prisma.js';

type CreatePixInput = {
  amountCents: number;
  description: string;
  customerRef: string;
  productRef: string;
  /** CPF/CNPJ somente digitos; muitos PSPs exigem para PIX. */
  consumer?: { name?: string; email?: string; document?: string };
  idempotencyKey: string;
};

export async function createCajuPayPix(input: CreatePixInput) {
  const config = await resolveCajuPayConfig();
  if (!config.apiKey || !config.apiSecret) {
    throw new Error('CAJUPAY_API_KEY/CAJUPAY_API_SECRET not configured');
  }

  const c = input.consumer;
  const consumerBody =
    c && (c.name || c.email || c.document)
      ? {
          name: c.name ?? undefined,
          email: c.email ?? undefined,
          document: c.document ?? undefined
        }
      : undefined;

  const response = await fetch(`${config.baseUrl}/api/payments/pix`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': config.apiKey,
      'X-API-Secret': config.apiSecret,
      'Idempotency-Key': input.idempotencyKey
    },
    body: JSON.stringify({
      amount_cents: input.amountCents,
      currency: 'BRL',
      customer_ref: input.customerRef,
      description: input.description,
      product_ref: input.productRef,
      consumer: consumerBody
    })
  });

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`CajuPay create pix failed (${response.status}): ${raw}`);
  }

  return response.json();
}

/** Resposta da lista de pagamentos pode vir em varios envelopes. */
export function normalizePaymentList(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;
  if (!body || typeof body !== 'object') return [];
  const o = body as Record<string, unknown>;
  const keys = ['data', 'payments', 'items', 'results', 'records', 'payments_data', 'rows'];
  for (const k of keys) {
    const v = o[k];
    if (Array.isArray(v)) return v;
    if (v && typeof v === 'object') {
      const inner = v as Record<string, unknown>;
      if (Array.isArray(inner.items)) return inner.items;
      if (Array.isArray(inner.data)) return inner.data;
    }
  }
  return [];
}

export function rowPaymentId(row: Record<string, unknown>): string | null {
  const v =
    row.payment_id ??
    row.paymentId ??
    row.payment_uuid ??
    row.paymentUuid ??
    row.id ??
    row.external_id ??
    row.externalId ??
    row.uuid;
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null;
}

export function rowStatus(row: Record<string, unknown>): string {
  const s =
    row.status ??
    row.payment_status ??
    row.paymentStatus ??
    row.state ??
    row.payment_state ??
    row.paymentState;
  return typeof s === 'string' && s.trim() ? s.trim() : '';
}

/** Detalhe de um pagamento (fallback quando nao aparece na lista recente). */
export async function getCajuPayPayment(paymentId: string) {
  const config = await resolveCajuPayConfig();
  if (!config.apiKey || !config.apiSecret) {
    throw new Error('CAJUPAY_API_KEY/CAJUPAY_API_SECRET not configured');
  }
  const url = `${config.baseUrl}/api/payments/${encodeURIComponent(paymentId)}`;
  const response = await fetch(url, {
    headers: {
      'X-API-Key': config.apiKey,
      'X-API-Secret': config.apiSecret
    }
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`CajuPay get payment failed (${response.status}): ${raw}`);
  }
  return response.json();
}

export async function listCajuPayPayments(limit = 100) {
  const config = await resolveCajuPayConfig();
  if (!config.apiKey || !config.apiSecret) {
    throw new Error('CAJUPAY_API_KEY/CAJUPAY_API_SECRET not configured');
  }

  const response = await fetch(`${config.baseUrl}/api/payments?limit=${limit}`, {
    headers: {
      'X-API-Key': config.apiKey,
      'X-API-Secret': config.apiSecret
    }
  });

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`CajuPay list payments failed (${response.status}): ${raw}`);
  }

  return response.json();
}

async function resolveCajuPayConfig() {
  const saved = await prisma.adminSetting.findUnique({ where: { key: 'cajupay' } });
  const value = (saved?.value ?? {}) as Record<string, unknown>;
  const rawBaseUrl = (typeof value.baseUrl === 'string' && value.baseUrl.trim()) || env.CAJUPAY_BASE_URL;
  const normalizedBaseUrl =
    typeof rawBaseUrl === 'string' && rawBaseUrl.length > 0
      ? rawBaseUrl.startsWith('http://') || rawBaseUrl.startsWith('https://')
        ? rawBaseUrl
        : `https://${rawBaseUrl}`
      : undefined;

  if (!normalizedBaseUrl) {
    throw new Error('CAJUPAY_BASE_URL not configured (admin settings or .env)');
  }

  return {
    baseUrl: normalizedBaseUrl,
    apiKey: (typeof value.apiKey === 'string' && value.apiKey.trim()) || env.CAJUPAY_API_KEY,
    apiSecret: (typeof value.apiSecret === 'string' && value.apiSecret.trim()) || env.CAJUPAY_API_SECRET
  };
}
