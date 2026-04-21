import { UnrecoverableError, Worker } from 'bullmq';
import { prisma } from '../../lib/prisma.js';
import { redis } from '../../lib/redis.js';
import { env } from '../../env.js';
import { resolveSmtpConfig, sendMailWithResolvedSmtp } from '../../lib/smtp-config.js';
import { ensureOrderPixCharge } from '../../lib/order-pix.js';
import { reconcilePendingPaymentsFromGateway } from '../../lib/payment-reconcile.js';
import { generateRawAccessToken, hashAccessToken, RESULT_ACCESS_TOKEN_TTL_MS } from '../../lib/result-access.js';
import { resultUnlockEmailJobOpts, sendResultEmailQueue } from './queues.js';

function workerLog(level: 'error' | 'warn', message: string, meta?: Record<string, unknown>) {
  const line = `[worker] ${message}`;
  if (level === 'error') console.error(line, meta ?? '');
  else console.warn(line, meta ?? '');
}

async function recordWorkerEmailFailure(input: {
  template: string;
  recipient: string;
  payload: Record<string, unknown>;
}) {
  try {
    await prisma.emailLog.create({
      data: {
        template: input.template,
        recipient: input.recipient,
        status: 'failed',
        payload: input.payload as object
      }
    });
  } catch (e) {
    workerLog('error', 'recordWorkerEmailFailure_write_failed', { err: String(e) });
  }
}

new Worker(
  'createPixCharge',
  async (job) => {
    const { orderId } = job.data as { orderId: string };
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error('order_not_found');
    await ensureOrderPixCharge(orderId);
  },
  { connection: redis }
);

new Worker(
  'reconcilePaymentStatus',
  async () => {
    const result = await reconcilePendingPaymentsFromGateway();
    if (result.markedPaid > 0) {
      workerLog('warn', 'reconcile_payments_marked_paid', result as Record<string, unknown>);
    }
  },
  { connection: redis }
);

/** Seguranca: polling na Caju a cada 1 min (alem da fila admin e webhooks). */
function startPeriodicPaymentReconcile() {
  const run = () => {
    void reconcilePendingPaymentsFromGateway().catch((e) =>
      workerLog('error', 'reconcile_periodic_failed', { err: String(e) })
    );
  };
  const intervalMs = 60_000;
  setInterval(run, intervalMs);
  setTimeout(run, 12_000);
}

startPeriodicPaymentReconcile();

const sendResultEmailWorker = new Worker(
  'sendResultEmail',
  async (job) => {
    const data = job.data as { kind?: 'result_unlock'; orderId?: string; to?: string; subject?: string; text?: string };
    const resolved = await resolveSmtpConfig();
    if (!resolved.ok) {
      let recipient = 'system';
      if (data.kind === 'result_unlock' && data.orderId) {
        const o = await prisma.order.findUnique({
          where: { id: data.orderId },
          include: { quizSession: { include: { lead: true } } }
        });
        recipient = o?.quizSession?.lead?.email ?? 'system';
      } else if (data.to) {
        recipient = data.to;
      }
      workerLog('error', 'sendResultEmail_smtp_unresolved', { error: resolved.error, jobId: job.id, orderId: data.orderId });
      await recordWorkerEmailFailure({
        template: data.kind === 'result_unlock' ? 'result_unlock' : 'generic',
        recipient,
        payload: { reason: 'smtp_unresolved', error: resolved.error, orderId: data.orderId, jobId: job.id }
      });
      throw new UnrecoverableError(`smtp:${resolved.error}`);
    }

    if (data.kind === 'result_unlock' && data.orderId) {
      const order = await prisma.order.findUnique({
        where: { id: data.orderId },
        include: { quizSession: { include: { lead: true } }, plan: true }
      });
      if (!order) {
        workerLog('error', 'sendResultEmail_order_not_found', { orderId: data.orderId, jobId: job.id });
        await recordWorkerEmailFailure({
          template: 'result_unlock',
          recipient: 'system',
          payload: { reason: 'order_not_found', orderId: data.orderId, jobId: job.id }
        });
        throw new UnrecoverableError('order_not_found');
      }
      if (order.status !== 'paid') {
        workerLog('warn', 'sendResultEmail_order_not_paid_retry', {
          orderId: order.id,
          status: order.status,
          jobId: job.id,
          attempt: job.attemptsMade
        });
        throw new Error(`order_not_paid:${order.status}`);
      }

      const activeToken = await prisma.resultAccessToken.findFirst({
        where: {
          orderId: order.id,
          revokedAt: null,
          expiresAt: { gt: new Date() }
        },
        orderBy: { createdAt: 'desc' }
      });
      const rawToken = generateRawAccessToken();
      const tokenHash = hashAccessToken(rawToken);
      const expiresAt = new Date(Date.now() + RESULT_ACCESS_TOKEN_TTL_MS);

      if (!activeToken) {
        await prisma.resultAccessToken.create({
          data: {
            orderId: order.id,
            tokenHash,
            expiresAt
          }
        });
      } else {
        await prisma.resultAccessToken.update({
          where: { id: activeToken.id },
          data: { tokenHash, expiresAt, usedAt: null }
        });
      }

      const accessLink = `${env.FRONTEND_BASE_URL.replace(/\/$/, '')}/resultado-completo?token=${rawToken}`;
      const subject = 'Seu resultado completo Nivel7 foi desbloqueado';
      const text = [
        `${order.quizSession.lead.name}, seu pagamento foi confirmado.`,
        `Seu Nivel de Aparencia e seu resultado completo ja estao desbloqueados.`,
        '',
        `Acesse agora: ${accessLink}`,
        '',
        'Este link fica valido por 24 horas a partir deste envio; pode abrir quantas vezes precisar ate expirar.'
      ].join('\n');

      try {
        const sendResult = await sendMailWithResolvedSmtp(resolved.config, {
          to: order.quizSession.lead.email,
          subject,
          text
        });
        await prisma.emailLog.create({
          data: {
            template: 'result_unlock',
            recipient: order.quizSession.lead.email,
            status: 'sent',
            providerId: sendResult.messageId ?? null,
            payload: { orderId: order.id, expiresAt: expiresAt.toISOString(), effectiveFrom: sendResult.effectiveFrom }
          }
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        workerLog('error', 'sendResultEmail_smtp_send_failed', { orderId: order.id, jobId: job.id, message });
        await recordWorkerEmailFailure({
          template: 'result_unlock',
          recipient: order.quizSession.lead.email,
          payload: { reason: 'smtp_send_error', orderId: order.id, message, jobId: job.id }
        });
        throw e instanceof Error ? e : new Error(String(e));
      }
      return;
    }

    const { to, subject, text } = data;
    if (!to || !subject || !text) {
      workerLog('warn', 'sendResultEmail_generic_incomplete', { jobId: job.id });
      await recordWorkerEmailFailure({
        template: 'generic',
        recipient: to ?? 'system',
        payload: { reason: 'generic_missing_fields', jobId: job.id }
      });
      throw new UnrecoverableError('generic_missing_fields');
    }
    try {
      const sendResult = await sendMailWithResolvedSmtp(resolved.config, { to, subject, text });
      await prisma.emailLog.create({
        data: {
          template: 'generic',
          recipient: to,
          status: 'sent',
          providerId: sendResult.messageId ?? null,
          payload: { ...(job.data as object), effectiveFrom: sendResult.effectiveFrom }
        }
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      workerLog('error', 'sendResultEmail_generic_smtp_failed', { jobId: job.id, message });
      await recordWorkerEmailFailure({
        template: 'generic',
        recipient: to,
        payload: { reason: 'smtp_send_error', message, jobId: job.id }
      });
      throw e instanceof Error ? e : new Error(String(e));
    }
  },
  { connection: redis }
);

sendResultEmailWorker.on('failed', (job, err) => {
  if (!job) return;
  workerLog('error', 'sendResultEmail_job_failed', {
    id: job.id,
    attemptsMade: job.attemptsMade,
    reason: err instanceof Error ? err.message : String(err)
  });
});

new Worker(
  'dispatchPixelEvent',
  async (job) => {
    await prisma.pixelEvent.create({
      data: {
        eventName: job.data.eventName,
        payload: job.data,
        status: 'sent',
        sentAt: new Date()
      }
    });
  },
  { connection: redis }
);
