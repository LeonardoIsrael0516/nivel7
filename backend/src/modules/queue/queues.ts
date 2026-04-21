import type { JobsOptions } from 'bullmq';
import { Queue } from 'bullmq';
import { redis } from '../../lib/redis.js';

export const createPixChargeQueue = new Queue('createPixCharge', { connection: redis });
export const reconcilePaymentQueue = new Queue('reconcilePaymentStatus', { connection: redis });
export const sendResultEmailQueue = new Queue('sendResultEmail', { connection: redis });
export const dispatchPixelQueue = new Queue('dispatchPixelEvent', { connection: redis });

/** Atraso + retentativas: o worker pode correr antes do `paid` ficar visivel na BD apos o commit. */
export const resultUnlockEmailJobOpts: JobsOptions = {
  attempts: 12,
  backoff: { type: 'exponential', delay: 2000 },
  delay: 2000
};
