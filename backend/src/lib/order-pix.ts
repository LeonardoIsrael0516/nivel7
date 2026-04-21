import { prisma } from './prisma.js';
import { createCajuPayPix } from '../modules/payments/cajupay-client.js';
import { env } from '../env.js';

const PIX_COPY_KEYS = [
  'pix_copy_paste',
  'pixCopyPaste',
  'pix_copia_e_cola',
  'pixCopiaECola',
  'copy_paste',
  'copyPaste',
  'emv',
  'brcode',
  'br_code',
  'brCode',
  'payload',
  'pixCode',
  'pix_code',
  'codigo_pix',
  'codigoPix',
  'copia_cola',
  'copiaCola',
  'copia_e_cola',
  'copiaECola',
  'qrcode_text',
  'qrcodeText',
  'text',
  'payment_code',
  'paymentCode',
  'encodable_line',
  'encodableLine',
  'emv_payload',
  'emvPayload',
  'dynamic_pix_qr_code',
  'static_pix_qr_code'
];

const PIX_QR_KEYS = [
  'pix_qr_code',
  'pixQrCode',
  'qr_code',
  'qrCode',
  'qrCodeBase64',
  'qr_code_base64',
  'qrcode',
  'encodedImage',
  'image_base64',
  'imageBase64',
  'base64',
  'base64_image',
  'base64Image',
  'qr_image',
  'qrImage',
  'imagem_qrcode',
  'imagemQrcode',
  'qr_code_url',
  'qrCodeUrl',
  'image_url',
  'imageUrl'
];

function findFirstStringByKeys(input: unknown, keys: string[]): string | null {
  if (!input) return null;

  if (Array.isArray(input)) {
    for (const item of input) {
      const found = findFirstStringByKeys(item, keys);
      if (found) return found;
    }
    return null;
  }

  if (typeof input === 'object') {
    const row = input as Record<string, unknown>;
    for (const [key, value] of Object.entries(row)) {
      if (keys.some((k) => k.toLowerCase() === key.toLowerCase()) && typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }
    for (const value of Object.values(row)) {
      const found = findFirstStringByKeys(value, keys);
      if (found) return found;
    }
  }

  return null;
}

function collectAllStrings(value: unknown, out: string[], seen: WeakSet<object>, depth: number) {
  if (depth > 14) return;
  if (value == null) return;
  if (typeof value === 'string') {
    const t = value.trim();
    if (t) out.push(t);
    return;
  }
  if (typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const item of value) collectAllStrings(item, out, seen, depth + 1);
    return;
  }
  const obj = value as object;
  if (seen.has(obj)) return;
  seen.add(obj);
  for (const v of Object.values(obj)) collectAllStrings(v, out, seen, depth + 1);
}

/** Copia-e-cola PIX (BR Code EMV) — gateways usam nomes diferentes no JSON. */
function looksLikePixCopiaECola(s: string): boolean {
  if (s.length < 50) return false;
  if (s.includes('BR.GOV.BCB.PIX')) return true;
  if (/^00020[0-9]{2}/.test(s)) return true;
  return false;
}

function pickBestPixCopiaECola(strings: string[]): string | null {
  const hits = strings.filter(looksLikePixCopiaECola);
  if (!hits.length) return null;
  hits.sort((a, b) => b.length - a.length);
  return hits[0] ?? null;
}

function looksLikeQrImageOrUrl(s: string): boolean {
  if (s.startsWith('data:image/')) return true;
  if (/^https?:\/\/.+\.(png|jpe?g|gif|webp)(\?|$)/i.test(s)) return true;
  if (s.startsWith('iVBOR') && s.length > 80) return true;
  if (/^[A-Za-z0-9+/=\s]+$/.test(s) && s.length > 400 && !looksLikePixCopiaECola(s)) return true;
  return false;
}

function pickBestQrCode(strings: string[]): string | null {
  const nonPix = strings.filter((s) => !looksLikePixCopiaECola(s));
  const dataUrl = nonPix.find((x) => x.startsWith('data:image/'));
  if (dataUrl) return dataUrl;
  const url = nonPix.find((x) => /^https?:\/\//i.test(x) && looksLikeQrImageOrUrl(x));
  if (url) return url;
  const hits = nonPix.filter(looksLikeQrImageOrUrl);
  if (!hits.length) return null;
  hits.sort((a, b) => b.length - a.length);
  return hits[0] ?? null;
}

function deepFindPixFallback(payload: unknown): { pixCopyPaste: string | null; qrCode: string | null } {
  const bucket: string[] = [];
  collectAllStrings(payload, bucket, new WeakSet(), 0);
  const pixCopyPaste = pickBestPixCopiaECola(bucket);
  const qrFromStrings = pickBestQrCode(bucket);
  return { pixCopyPaste, qrCode: qrFromStrings };
}

function normalizeQrCodeForClient(qr: string | null): string | null {
  if (!qr) return null;
  const t = qr.trim();
  if (t.startsWith('data:image/') || /^https?:\/\//i.test(t)) return t;
  const clean = t.replace(/\s/g, '');
  if (clean.startsWith('iVBOR')) return `data:image/png;base64,${clean}`;
  if (clean.startsWith('/9j/')) return `data:image/jpeg;base64,${clean}`;
  return t;
}

export function extractPixFieldsFromPayload(payload: unknown): { pixCopyPaste: string | null; qrCode: string | null } {
  const keyCopy = findFirstStringByKeys(payload, PIX_COPY_KEYS);
  const keyQr = findFirstStringByKeys(payload, PIX_QR_KEYS);
  const deep = deepFindPixFallback(payload);
  return {
    pixCopyPaste: keyCopy ?? deep.pixCopyPaste,
    qrCode: normalizeQrCodeForClient(keyQr ?? deep.qrCode)
  };
}

export function extractGatewayErrorMessage(payload: unknown): string | null {
  return findFirstStringByKeys(payload, ['errorMessage', 'error', 'message', 'detail']);
}

function defaultConsumerDocument(): string {
  const raw = (env.CAJUPAY_DEFAULT_CONSUMER_DOCUMENT ?? '00000000191').replace(/\D/g, '');
  return raw.length === 11 ? raw : '00000000191';
}

export function paymentTransactionHasUsablePix(tx: { status: string; responsePayload: unknown } | null | undefined): boolean {
  if (!tx) return false;
  if (tx.status === 'error') return false;
  const { pixCopyPaste, qrCode } = extractPixFieldsFromPayload(tx.responsePayload);
  return Boolean(pixCopyPaste || qrCode);
}

function pickPaymentId(response: Record<string, unknown>): string | null {
  const v = response.payment_id ?? response.paymentId ?? response.id;
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function pickStatus(response: Record<string, unknown>): string {
  const s = response.status;
  return typeof s === 'string' && s.trim() ? s.trim() : 'pending';
}

function pickPspReference(response: Record<string, unknown>): string | null {
  const v = response.psp_reference ?? response.pspReference ?? response.reference;
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

/**
 * Garante uma linha PaymentTransaction com payload CajuPay utilizavel (PIX + QR).
 * Se a ultima transacao for erro ou nao tiver PIX, chama a API de novo e atualiza essa linha (evita ficar preso sem retry).
 */
export async function ensureOrderPixCharge(orderId: string) {
  const latest = await prisma.paymentTransaction.findFirst({
    where: { orderId },
    orderBy: { createdAt: 'desc' }
  });

  if (latest && paymentTransactionHasUsablePix(latest)) {
    return latest;
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { quizSession: { include: { lead: true } }, plan: true }
  });
  if (!order) return null;

  const response = (await createCajuPayPix({
    amountCents: order.amountCents,
    description: `Pedido ${order.id}`,
    customerRef: order.id,
    productRef: order.plan.code,
    consumer: {
      name: order.quizSession.lead.name,
      email: order.quizSession.lead.email,
      document: defaultConsumerDocument()
    },
    idempotencyKey: order.idempotencyKey
  })) as Record<string, unknown>;

  const paymentId = pickPaymentId(response) ?? `${order.id}-pix`;
  const status = pickStatus(response);
  const pspReference = pickPspReference(response);
  const responsePayload = response as object;

  if (latest && (latest.status === 'error' || !paymentTransactionHasUsablePix(latest))) {
    return prisma.paymentTransaction.update({
      where: { id: latest.id },
      data: {
        gateway: 'cajupay',
        paymentId,
        pspReference,
        status,
        responsePayload
      }
    });
  }

  return prisma.paymentTransaction.create({
    data: {
      orderId: order.id,
      gateway: 'cajupay',
      paymentId,
      pspReference,
      status,
      requestPayload: { orderId: order.id },
      responsePayload
    }
  });
}
