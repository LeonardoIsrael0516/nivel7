import { randomUUID } from 'node:crypto';
import nodemailer from 'nodemailer';
import { prisma } from './prisma.js';
import { env } from '../env.js';

export type ResolvedSmtp = {
  host: string;
  port: number;
  user?: string;
  pass?: string;
  from: string;
};

function domainFromEmail(email: string): string | undefined {
  const at = email.lastIndexOf('@');
  if (at === -1 || at === email.length - 1) return undefined;
  return email.slice(at + 1).toLowerCase();
}

/** Extrai o primeiro endereco `x@y` de `"Nome" <x@y>` ou de texto solto. */
export function extractBareEmail(input: string): string | undefined {
  const t = input.trim();
  if (!t) return undefined;
  const angled = t.match(/<([^>\s]+@[^>\s]+)>/);
  if (angled) return angled[1].toLowerCase();
  const stripped = t.replace(/^"+|"+$/g, '').trim();
  if (/^[^\s<]+@[^\s>]+\.[^\s>]+$/i.test(stripped)) return stripped.toLowerCase();
  const loose = t.match(/([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i);
  return loose ? loose[1].toLowerCase() : undefined;
}

/** From = e-mail do utilizador SMTP (ja alinhado em resolveSmtpConfig). */
export function normalizeSmtpMailFrom(config: ResolvedSmtp): { fromHeader: string; identityDomain: string } {
  const userBare = config.user?.trim() ? extractBareEmail(config.user) ?? config.user.trim().toLowerCase() : undefined;
  if (!userBare?.includes('@')) {
    throw new Error('smtp_user_requires_email');
  }
  const fromBare = extractBareEmail(config.from.trim()) ?? config.from.trim().toLowerCase();
  if (fromBare !== userBare) {
    throw new Error('smtp_from_must_match_user');
  }
  const domain = domainFromEmail(userBare);
  if (!domain || domain === 'localhost') {
    throw new Error('smtp_from_domain_invalid');
  }
  return { fromHeader: userBare, identityDomain: domain };
}

/** Remove protocol / path mistakes pasted into the host field. */
function normalizeSmtpHost(raw: string): string {
  let h = raw.trim();
  const proto = /^smtps?:\/\//i;
  if (proto.test(h)) h = h.replace(proto, '');
  const slash = h.indexOf('/');
  if (slash !== -1) h = h.slice(0, slash);
  return h.trim();
}

/** Nodemailer options aligned with common providers (465 TLS, 587/2525 STARTTLS). */
export function buildSmtpTransportOptions(config: {
  host: string;
  port: number;
  user?: string;
  pass?: string;
  /** Identidade EHLO — evitar hostname OS `localhost` (Message-ID @localhost / EHLO localhost quebram entrega no Gmail). */
  localHostname?: string;
}) {
  const host = normalizeSmtpHost(config.host);
  const port = config.port;
  const implicitTls = port === 465;
  const preferStartTls = port === 587 || port === 2525;

  return {
    host,
    port,
    secure: implicitTls,
    requireTLS: preferStartTls && !implicitTls,
    connectionTimeout: 60_000,
    greetingTimeout: 45_000,
    socketTimeout: 60_000,
    auth: config.user && config.pass ? { user: config.user, pass: config.pass } : undefined,
    tls: { minVersion: 'TLSv1.2' as const },
    ...(config.localHostname ? { name: config.localHostname } : {})
  };
}

export function createNodemailerTransport(config: {
  host: string;
  port: number;
  user?: string;
  pass?: string;
  localHostname?: string;
}) {
  return nodemailer.createTransport(buildSmtpTransportOptions(config));
}

async function loadStoredSmtp(): Promise<{
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  from?: string;
}> {
  const saved = await prisma.adminSetting.findUnique({ where: { key: 'smtp' } });
  const v = (saved?.value ?? {}) as Record<string, unknown>;
  let port: number | undefined;
  const rawPort = v.port;
  if (typeof rawPort === 'number' && Number.isFinite(rawPort)) port = rawPort;
  else if (typeof rawPort === 'string' && rawPort.trim()) {
    const n = parseInt(rawPort, 10);
    if (!Number.isNaN(n)) port = n;
  }
  return {
    host: typeof v.host === 'string' && v.host.trim() ? v.host.trim() : undefined,
    port,
    user: typeof v.user === 'string' && v.user.trim() ? v.user.trim() : undefined,
    pass: typeof v.pass === 'string' && v.pass.trim() ? v.pass.trim() : undefined,
    from: typeof v.from === 'string' && v.from.trim() ? v.from.trim() : undefined
  };
}

/** Resolve SMTP para teste/admin/worker: remetente (From) e sempre o e-mail do utilizador SMTP. */
export async function resolveSmtpConfig(overrides?: {
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  from?: string;
}): Promise<{ ok: true; config: ResolvedSmtp } | { ok: false; error: string }> {
  const stored = await loadStoredSmtp();
  const host = normalizeSmtpHost(overrides?.host?.trim() || stored.host || env.SMTP_HOST || '');
  const port = overrides?.port ?? stored.port ?? env.SMTP_PORT;
  const userRaw = (overrides?.user?.trim() || stored.user || env.SMTP_USER || '').trim() || undefined;
  const pass =
    overrides?.pass !== undefined && overrides.pass.length > 0
      ? overrides.pass
      : stored.pass || env.SMTP_PASS || undefined;

  if (!host) return { ok: false, error: 'smtp_host_missing' };
  if (port === undefined || !Number.isFinite(port)) return { ok: false, error: 'smtp_port_missing' };

  const userBare = userRaw ? extractBareEmail(userRaw) ?? userRaw.toLowerCase() : undefined;
  if (!userBare?.includes('@')) {
    return { ok: false, error: 'smtp_user_email_missing' };
  }

  // From efetivo = e-mail do login SMTP. Ignoramos SMTP_FROM / stored.from / overrides.from se divergirem
  // (antes gerava `smtp_from_must_match_user` e bloqueava o worker com .env inconsistente).

  return { ok: true, config: { host, port, user: userRaw!, pass, from: userBare } };
}

export type SendMailResult = {
  messageId?: string;
  effectiveFrom: string;
  accepted: string[];
  rejected: string[];
  smtpResponse?: string;
  envelopeFrom?: string;
  envelopeTo?: string[];
};

export async function sendMailWithResolvedSmtp(
  config: ResolvedSmtp,
  mail: { to: string; subject: string; text: string; /** Só para e-mails de teste no admin */ footerNote?: string }
): Promise<SendMailResult> {
  const { fromHeader, identityDomain } = normalizeSmtpMailFrom(config);
  const messageId = `${randomUUID()}@${identityDomain}`;

  const transport = createNodemailerTransport({
    host: config.host,
    port: config.port,
    user: config.user,
    pass: config.pass,
    localHostname: identityDomain
  });
  const body = mail.footerNote ? `${mail.text}\n\n---\n${mail.footerNote}` : mail.text;
  const info = await transport.sendMail({
    from: fromHeader,
    to: mail.to,
    subject: mail.subject,
    text: body,
    messageId
  });
  transport.close();
  const accepted = Array.isArray(info.accepted) ? info.accepted.map(String) : [];
  const rejected = Array.isArray(info.rejected) ? info.rejected.map(String) : [];
  const envFrom = info.envelope?.from;
  const envelopeFrom = typeof envFrom === 'string' ? envFrom : undefined;

  return {
    messageId: typeof info.messageId === 'string' ? info.messageId : undefined,
    effectiveFrom: fromHeader,
    accepted,
    rejected,
    smtpResponse: typeof info.response === 'string' ? info.response : undefined,
    envelopeFrom,
    envelopeTo: info.envelope?.to
  };
}
