import { createHash, randomBytes } from 'node:crypto';

/** Validade do link de resultado no e-mail (e apos rotacao do token). */
export const RESULT_ACCESS_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export function generateRawAccessToken() {
  return randomBytes(32).toString('hex');
}

export function hashAccessToken(rawToken: string) {
  return createHash('sha256').update(rawToken).digest('hex');
}

