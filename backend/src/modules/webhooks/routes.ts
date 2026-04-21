import { FastifyInstance, FastifyRequest } from 'fastify';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../env.js';
import { isPaidGatewayStatus } from '../../lib/payment-reconcile.js';
import { resultUnlockEmailJobOpts, sendResultEmailQueue } from '../queue/queues.js';
import { rowPaymentId, rowStatus } from '../payments/cajupay-client.js';

function readWebhookSecret(req: FastifyRequest): string | undefined {
  const candidates = [
    'x-cajupay-webhook-secret',
    'x-webhook-secret',
    'x-caju-signature',
    'x-signature',
    'x-webhook-signature'
  ];
  for (const key of candidates) {
    const raw = req.headers[key] ?? req.headers[key.toLowerCase() as keyof typeof req.headers];
    const v = Array.isArray(raw) ? raw[0] : raw;
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

function collectStatusHints(r: Record<string, unknown>): string[] {
  const parts: string[] = [];
  const st = rowStatus(r);
  if (st) parts.push(st);
  if (typeof r.event === 'string' && r.event.trim()) parts.push(r.event.trim());
  if (typeof r.type === 'string' && r.type.trim()) parts.push(r.type.trim());
  if (typeof r.action === 'string' && r.action.trim()) parts.push(r.action.trim());
  return parts;
}

function firstExplicitRowStatus(body: unknown): string {
  if (!body || typeof body !== 'object') return '';
  const o = body as Record<string, unknown>;
  let s = rowStatus(o);
  if (s) return s;
  for (const n of [o.data, o.payment, o.payload, o.resource]) {
    if (n && typeof n === 'object' && !Array.isArray(n)) {
      s = rowStatus(n as Record<string, unknown>);
      if (s) return s;
    }
  }
  return '';
}

/** Extrai payment id e status de payloads variados (CajuPay / gateways). */
function extractWebhookPaymentAndStatus(body: unknown): { paymentId: string | null; statusRaw: string } {
  if (!body || typeof body !== 'object') return { paymentId: null, statusRaw: '' };
  const o = body as Record<string, unknown>;
  const statusParts: string[] = [];

  let paymentId = rowPaymentId(o);
  statusParts.push(...collectStatusHints(o));

  const nests = [o.data, o.payment, o.payload, o.resource, o.object, o.body].filter(
    (x): x is Record<string, unknown> => x != null && typeof x === 'object' && !Array.isArray(x)
  );
  for (const inner of nests) {
    paymentId = paymentId ?? rowPaymentId(inner);
    statusParts.push(...collectStatusHints(inner));
  }

  return { paymentId, statusRaw: statusParts.filter(Boolean).join(' ') };
}

export async function webhookRoutes(app: FastifyInstance) {
  app.post(
    '/webhooks/cajupay',
    { config: { rateLimit: false } },
    async (req, reply) => {
      const secret = env.CAJUPAY_WEBHOOK_SECRET;
      if (secret) {
        const signature = readWebhookSecret(req);
        if (!signature || signature !== secret) {
          req.log.warn(
            { hasSig: Boolean(signature), headerKeys: Object.keys(req.headers).filter((k) => k.toLowerCase().includes('secret') || k.toLowerCase().includes('signature')) },
            'webhook_cajupay_secret_mismatch_or_missing'
          );
          return reply.unauthorized('invalid_webhook_secret');
        }
      }

      const body = req.body;
      const { paymentId, statusRaw } = extractWebhookPaymentAndStatus(body);

      if (!paymentId) {
        req.log.info({ bodyKeys: body && typeof body === 'object' ? Object.keys(body as object) : [] }, 'webhook_cajupay_no_payment_id');
        return reply.send({ ok: true, ignored: true });
      }

      const tx = await prisma.paymentTransaction.findFirst({ where: { paymentId } });
      if (!tx) {
        req.log.warn({ paymentId }, 'webhook_cajupay_tx_not_found');
        return reply.send({ ok: true, ignored: true });
      }

      const paid = isPaidGatewayStatus(statusRaw);
      const explicitStatus = firstExplicitRowStatus(body);
      const newTxStatus = paid ? 'paid' : explicitStatus || tx.status;

      await prisma.paymentTransaction.update({
        where: { id: tx.id },
        data: {
          status: newTxStatus,
          responsePayload: body as object
        }
      });

      if (paid) {
        const updatedOrder = await prisma.order.updateMany({
          where: { id: tx.orderId, status: { not: 'paid' } },
          data: { status: 'paid', paidAt: new Date() }
        });
        if (updatedOrder.count > 0) {
          await sendResultEmailQueue.add(
            'send_result_email',
            { kind: 'result_unlock', orderId: tx.orderId },
            resultUnlockEmailJobOpts
          );
        }
      }

      return reply.send({ ok: true });
    }
  );
}
