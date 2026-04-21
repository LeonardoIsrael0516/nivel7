import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ulid } from 'ulid';
import { prisma } from '../../lib/prisma.js';
import { validateQuizAnswersComplete } from '../../lib/quiz-answers.js';
import {
  createPixChargeQueue,
  dispatchPixelQueue,
  resultUnlockEmailJobOpts,
  sendResultEmailQueue
} from '../queue/queues.js';
import { hashAccessToken } from '../../lib/result-access.js';
import {
  ensureOrderPixCharge,
  extractGatewayErrorMessage,
  extractPixFieldsFromPayload,
  paymentTransactionHasUsablePix
} from '../../lib/order-pix.js';
import { reconcilePendingPaymentsFromGateway } from '../../lib/payment-reconcile.js';

/** Evita bater na Caju a cada poll; reconcilia pedidos pendentes no max ~1x / 30s por instancia. */
let lastGlobalPaymentReconcileMs = 0;
const PAYMENT_STATUS_RECONCILE_GAP_MS = 30_000;

const leadSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  source: z.string().optional(),
  consent: z.boolean().default(false)
});

const quizSessionSchema = z.object({
  leadId: z.string(),
  answers: z.record(z.any()),
  score: z.number().optional(),
  archetype: z.string().optional()
});

const orderSchema = z.object({
  quizSessionId: z.string(),
  planCode: z.enum(['basico', 'completo'])
});

const accessTokenSchema = z.object({
  token: z.string().min(32)
});

export async function publicRoutes(app: FastifyInstance) {
  app.get('/pixel/meta', async () => {
    const row = await prisma.adminSetting.findUnique({ where: { key: 'pixel' } });
    const value = (row?.value ?? {}) as Record<string, unknown>;
    const enabled = Boolean(value.enabled);
    const metaPixelId = typeof value.metaPixelId === 'string' ? value.metaPixelId.trim() : '';
    const metaTestEventCode = typeof value.metaTestEventCode === 'string' ? value.metaTestEventCode.trim() : '';
    return {
      enabled: enabled && metaPixelId.length > 0,
      metaPixelId,
      metaTestEventCode: metaTestEventCode || null
    };
  });

  app.get('/plans', async () => {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' }
    });
    return plans.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      priceCents: p.priceCents
    }));
  });

  app.post('/leads', async (req, reply) => {
    const payload = leadSchema.parse(req.body);
    const lead = await prisma.lead.upsert({
      where: { email: payload.email },
      update: { name: payload.name, source: payload.source, consent: payload.consent },
      create: payload
    });
    return reply.send(lead);
  });

  app.post('/quiz-sessions', async (req, reply) => {
    const payload = quizSessionSchema.parse(req.body);
    const incomplete = validateQuizAnswersComplete(payload.answers);
    if (incomplete) {
      return reply.code(400).send({ error: 'quiz_answers_incomplete', detail: incomplete });
    }
    const session = await prisma.quizSession.upsert({
      where: { leadId: payload.leadId },
      update: { answers: payload.answers, score: payload.score, archetype: payload.archetype, status: 'completed' },
      create: { ...payload, status: 'completed' }
    });

    await dispatchPixelQueue.add('quiz_completed', { eventName: 'quiz_completed', quizSessionId: session.id });
    return reply.send(session);
  });

  app.post('/orders', async (req, reply) => {
    const payload = orderSchema.parse(req.body);
    const plan = await prisma.plan.findUnique({ where: { code: payload.planCode } });
    if (!plan) return reply.notFound('plan_not_found');

    const quizSession = await prisma.quizSession.findUnique({ where: { id: payload.quizSessionId } });
    if (!quizSession) return reply.notFound('quiz_session_not_found');
    const sessionIncomplete = validateQuizAnswersComplete(quizSession.answers);
    if (sessionIncomplete) {
      return reply.code(400).send({ error: 'quiz_session_incomplete', detail: sessionIncomplete });
    }

    const order = await prisma.order.create({
      data: {
        quizSessionId: payload.quizSessionId,
        planId: plan.id,
        amountCents: plan.priceCents,
        idempotencyKey: ulid()
      }
    });

    try {
      await ensureOrderPixCharge(order.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown_error';
      req.log.warn({ orderId: order.id, errorMessage: message }, 'direct pix creation failed, queue fallback enqueued');
      await prisma.paymentTransaction.create({
        data: {
          orderId: order.id,
          gateway: 'cajupay',
          paymentId: `${order.id}-pix-error-${Date.now()}`,
          status: 'error',
          requestPayload: { orderId: order.id },
          responsePayload: { errorMessage: message }
        }
      });
      await createPixChargeQueue.add(
        'create_pix_charge',
        { orderId: order.id },
        { attempts: 5, backoff: { type: 'exponential', delay: 1000 } }
      );
    }

    return reply.send({ orderId: order.id, status: order.status, amountCents: order.amountCents, planCode: plan.code });
  });

  app.get('/payments/:orderId/status', { config: { rateLimit: { max: 90, timeWindow: '1 minute' } } }, async (req, reply) => {
    const params = z.object({ orderId: z.string() }).parse(req.params);
    const statusInclude = {
      paymentTxs: { orderBy: { createdAt: 'desc' as const }, take: 1 },
      plan: true,
      quizSession: { include: { lead: true } }
    } as const;

    let order = await prisma.order.findUnique({
      where: { id: params.orderId },
      include: statusInclude
    });
    if (!order) return reply.notFound('order_not_found');
    let latestPayment = order.paymentTxs[0] ?? null;
    if (order.status === 'pending' && !paymentTransactionHasUsablePix(latestPayment)) {
      try {
        const ensured = await ensureOrderPixCharge(order.id);
        if (ensured) latestPayment = ensured;
      } catch (error) {
        req.log.warn({ orderId: order.id, error }, 'pix is not ready yet');
      }
    }

    if (order.status === 'pending') {
      const now = Date.now();
      if (now - lastGlobalPaymentReconcileMs >= PAYMENT_STATUS_RECONCILE_GAP_MS) {
        lastGlobalPaymentReconcileMs = now;
        try {
          await reconcilePendingPaymentsFromGateway();
        } catch (e) {
          req.log.warn({ err: String(e) }, 'payment_status_reconcile_failed');
        }
        const refreshed = await prisma.order.findUnique({
          where: { id: order.id },
          include: statusInclude
        });
        if (refreshed) {
          order = refreshed;
          latestPayment = refreshed.paymentTxs[0] ?? null;
        }
      }
    }

    const responsePayload = latestPayment?.responsePayload as Record<string, unknown> | null;
    const { pixCopyPaste, qrCode } = extractPixFieldsFromPayload(responsePayload);
    const pixError =
      !pixCopyPaste && !qrCode ? extractGatewayErrorMessage(responsePayload) : null;

    return reply.send({
      orderId: order.id,
      status: order.status,
      paidAt: order.paidAt,
      canAccessResults: order.status === 'paid',
      amountCents: order.amountCents,
      planName: order.plan.name,
      customer: {
        name: order.quizSession.lead.name,
        email: order.quizSession.lead.email
      },
      latestPayment,
      pix: responsePayload
        ? {
            qrCode,
            pixCopyPaste
          }
        : null,
      pixReady: Boolean(pixCopyPaste || qrCode),
      pixError: !pixCopyPaste && !qrCode ? pixError : null
    });
  });

  app.post('/orders/:orderId/send-result-email', async (req, reply) => {
    const params = z.object({ orderId: z.string() }).parse(req.params);
    const order = await prisma.order.findUnique({
      where: { id: params.orderId },
      include: { quizSession: { include: { lead: true } } }
    });
    if (!order) return reply.notFound('order_not_found');

    await sendResultEmailQueue.add(
      'send_result_email',
      { kind: 'result_unlock', orderId: order.id },
      resultUnlockEmailJobOpts
    );
    return reply.send({ ok: true });
  });

  app.post('/results/access', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (req, reply) => {
    const payload = accessTokenSchema.parse(req.body);
    const tokenHash = hashAccessToken(payload.token);
    const accessToken = await prisma.resultAccessToken.findUnique({
      where: { tokenHash },
      include: {
        order: {
          include: {
            plan: true,
            quizSession: { include: { lead: true } }
          }
        }
      }
    });

    if (!accessToken) return reply.unauthorized('invalid_token');
    if (accessToken.revokedAt) return reply.unauthorized('token_revoked');
    if (accessToken.expiresAt.getTime() <= Date.now()) return reply.unauthorized('token_expired');
    if (accessToken.order.status !== 'paid') {
      return reply.forbidden('order_not_paid');
    }

    // Link multi-uso ate expiresAt (24h desde a ultima emissao no e-mail); nao marcamos usedAt para permitir refresh e reabrir.

    const plan = accessToken.order.plan;
    const session = accessToken.order.quizSession;
    const leadRow = session.lead;

    return reply.send({
      orderId: accessToken.order.id,
      paidAt: accessToken.order.paidAt,
      quizSessionId: accessToken.order.quizSessionId,
      leadId: leadRow.id,
      plan: {
        id: plan.id,
        code: plan.code,
        name: plan.name,
        priceCents: plan.priceCents
      },
      lead: {
        name: leadRow.name,
        email: leadRow.email
      },
      result: {
        answers: session.answers,
        score: session.score,
        archetype: session.archetype
      }
    });
  });
}
