import { prisma } from './prisma.js';
import {
  getCajuPayPayment,
  listCajuPayPayments,
  normalizePaymentList,
  rowPaymentId,
  rowStatus
} from '../modules/payments/cajupay-client.js';

function compoundGatewayStatus(row: Record<string, unknown>): string {
  const parts: string[] = [];
  const st = rowStatus(row);
  if (st) parts.push(st);
  if (typeof row.event === 'string' && row.event.trim()) parts.push(row.event.trim());
  if (typeof row.type === 'string' && row.type.trim()) parts.push(row.type.trim());
  return parts.join(' ');
}
import { resultUnlockEmailJobOpts, sendResultEmailQueue } from '../modules/queue/queues.js';

/** Status retornado por PSPs (lista, webhook, GET) que devem marcar pedido como pago. */
export function isPaidGatewayStatus(s: string | null | undefined): boolean {
  if (s == null || s === '') return false;
  const paidTokens = new Set(['paid', 'approved', 'completed', 'succeeded', 'confirmed', 'settled', 'paidout']);
  const alphaParts = String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const neg = new Set(['unpaid', 'notpaid', 'refused', 'failed', 'canceled', 'cancelled', 'expired', 'declined']);
  if (alphaParts.some((p) => neg.has(p))) return false;
  if (alphaParts.includes('not') && alphaParts.includes('paid')) return false;
  return alphaParts.some((p) => paidTokens.has(p));
}

function normalizeTxStatusFromGateway(st: string): string {
  if (isPaidGatewayStatus(st)) return 'paid';
  const low = st.toLowerCase();
  if (['failed', 'canceled', 'cancelled', 'expired', 'refused', 'declined', 'error'].includes(low)) return 'error';
  return low || 'pending';
}

function isSyntheticErrorPaymentId(id: string): boolean {
  return id.includes('-pix-error-');
}

/**
 * Sincroniza transacoes de pedidos ainda pendentes com a CajuPay (lista recente + GET por paymentId).
 * Idempotente: pode rodar em paralelo (fila + cron).
 */
export async function reconcilePendingPaymentsFromGateway(): Promise<{
  scanned: number;
  markedPaid: number;
  listRows: number;
}> {
  const txs = await prisma.paymentTransaction.findMany({
    where: { order: { status: 'pending' } },
    include: { order: true },
    orderBy: { createdAt: 'desc' }
  });

  if (!txs.length) {
    return { scanned: 0, markedPaid: 0, listRows: 0 };
  }

  let listRows: unknown[] = [];
  try {
    const raw = await listCajuPayPayments(250);
    listRows = normalizePaymentList(raw);
  } catch {
    listRows = [];
  }

  const byPaymentId = new Map<string, Record<string, unknown>>();
  for (const row of listRows) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const id = rowPaymentId(r);
    if (id) byPaymentId.set(id, r);
  }

  let markedPaid = 0;

  for (const tx of txs) {
    const pid = tx.paymentId?.trim();
    if (!pid || isSyntheticErrorPaymentId(pid)) continue;

    let remote: Record<string, unknown> | undefined = byPaymentId.get(pid);
    if (!remote) {
      try {
        const one = await getCajuPayPayment(pid);
        if (one && typeof one === 'object') remote = one as Record<string, unknown>;
      } catch {
        /* gateway sem GET por id ou rede */
      }
    }
    if (!remote) continue;

    const gatewayStatusRaw = compoundGatewayStatus(remote);
    const txStatus = normalizeTxStatusFromGateway(gatewayStatusRaw);

    await prisma.paymentTransaction.update({
      where: { id: tx.id },
      data: {
        status: txStatus,
        responsePayload: remote as object
      }
    });

    if (isPaidGatewayStatus(gatewayStatusRaw)) {
      const updatedOrder = await prisma.order.updateMany({
        where: { id: tx.orderId, status: { not: 'paid' } },
        data: { status: 'paid', paidAt: new Date() }
      });
      if (updatedOrder.count > 0) {
        markedPaid += 1;
        await sendResultEmailQueue.add(
          'send_result_email',
          { kind: 'result_unlock', orderId: tx.orderId },
          resultUnlockEmailJobOpts
        );
      }
    }
  }

  return { scanned: txs.length, markedPaid, listRows: listRows.length };
}
