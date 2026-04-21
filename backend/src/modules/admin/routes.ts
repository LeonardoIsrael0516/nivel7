import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import argon2 from 'argon2';
import { extractBareEmail, resolveSmtpConfig, sendMailWithResolvedSmtp } from '../../lib/smtp-config.js';
import { loginAdmin, requireAdminAuth } from './auth.js';
import { reconcilePaymentQueue, resultUnlockEmailJobOpts, sendResultEmailQueue } from '../queue/queues.js';

export async function adminRoutes(app: FastifyInstance) {
  app.post('/auth/login', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (req, reply) => {
    const body = z.object({ email: z.string().email(), password: z.string().min(8) }).parse(req.body);
    const admin = await loginAdmin(body.email, body.password);
    if (!admin) return reply.unauthorized('invalid_credentials');

    const token = await reply.jwtSign({ sub: admin.id, role: 'admin' }, { expiresIn: '15m' });
    return reply.send({ token });
  });

  await app.register(async (protectedRoutes) => {
    protectedRoutes.addHook('preHandler', requireAdminAuth);

    protectedRoutes.get('/me', async (req) => {
      const userId = (req as any).user?.sub as string | undefined;
      if (!userId) return { id: '', email: '' };
      const admin = await prisma.adminUser.findUnique({ where: { id: userId } });
      return { id: admin?.id ?? '', email: admin?.email ?? '' };
    });

    protectedRoutes.patch('/me', async (req, reply) => {
      const userId = (req as any).user?.sub as string | undefined;
      if (!userId) return reply.unauthorized('admin_auth_required');

      const body = z
        .object({
          currentPassword: z.string().min(8),
          newEmail: z.string().email().optional(),
          newPassword: z.string().min(8).optional()
        })
        .refine((v) => v.newEmail || v.newPassword, { message: 'no_changes' })
        .parse(req.body);

      const admin = await prisma.adminUser.findUnique({ where: { id: userId } });
      if (!admin || !admin.isActive) return reply.unauthorized('invalid_credentials');
      const valid = await argon2.verify(admin.passwordHash, body.currentPassword);
      if (!valid) return reply.unauthorized('invalid_credentials');

      const update: { email?: string; passwordHash?: string } = {};
      if (body.newEmail) update.email = body.newEmail.trim().toLowerCase();
      if (body.newPassword) update.passwordHash = await argon2.hash(body.newPassword);

      try {
        const updated = await prisma.adminUser.update({ where: { id: admin.id }, data: update });
        return reply.send({ ok: true, email: updated.email });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('Unique constraint') || msg.toLowerCase().includes('unique')) {
          return reply.code(409).send({ ok: false, error: 'email_in_use' });
        }
        throw e;
      }
    });

    protectedRoutes.get('/plans', async () => prisma.plan.findMany({ orderBy: { createdAt: 'asc' } }));
    protectedRoutes.post('/plans', async (req) => {
      const body = z.object({ code: z.string().min(2), name: z.string().min(2), priceCents: z.number().int().positive() }).parse(req.body);
      return prisma.plan.create({ data: body });
    });
    protectedRoutes.patch('/plans/:id', async (req) => {
      const params = z.object({ id: z.string() }).parse(req.params);
      const body = z.object({
        name: z.string().min(2).optional(),
        priceCents: z.number().int().positive().optional(),
        isActive: z.boolean().optional()
      }).parse(req.body);
      return prisma.plan.update({ where: { id: params.id }, data: body });
    });

    protectedRoutes.get('/orders', async () =>
      prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          plan: true,
          paymentTxs: { orderBy: { createdAt: 'desc' }, take: 1 },
          quizSession: { include: { lead: true } }
        },
        take: 100
      })
    );

    protectedRoutes.post('/orders/:id/approve-payment', async (req) => {
      const params = z.object({ id: z.string() }).parse(req.params);
      const order = await prisma.order.findUnique({ where: { id: params.id } });
      if (!order) return { ok: false, reason: 'order_not_found' as const };

      const updated = await prisma.order.updateMany({
        where: { id: params.id, status: { not: 'paid' } },
        data: { status: 'paid', paidAt: new Date() }
      });

      if (updated.count > 0) {
        await prisma.paymentTransaction.create({
          data: {
            orderId: params.id,
            gateway: 'manual_admin',
            paymentId: `manual-${Date.now()}`,
            status: 'paid',
            requestPayload: { source: 'admin_manual_approval' },
            responsePayload: {
              approvedAt: new Date().toISOString(),
              approvedBy: (req as any).user?.sub ?? 'admin'
            }
          }
        });
        await prisma.emailLog.create({
          data: {
            template: 'audit_manual_payment',
            recipient: 'admin',
            status: 'logged',
            payload: { orderId: params.id, actor: (req as any).user?.sub ?? 'admin' }
          }
        });
        await sendResultEmailQueue.add(
          'send_result_email',
          { kind: 'result_unlock', orderId: params.id },
          resultUnlockEmailJobOpts
        );
      }

      return { ok: true, updated: updated.count > 0, status: updated.count > 0 ? 'paid' : order.status };
    });

    protectedRoutes.post('/orders/:id/resend-result-email', async (req, reply) => {
      const params = z.object({ id: z.string() }).parse(req.params);
      const order = await prisma.order.findUnique({
        where: { id: params.id },
        include: { quizSession: { include: { lead: true } } }
      });
      if (!order) return reply.code(404).send({ ok: false as const, reason: 'order_not_found' as const });
      if (order.status !== 'paid') {
        return reply.code(400).send({ ok: false as const, reason: 'order_not_paid' as const, status: order.status });
      }

      await prisma.emailLog.create({
        data: {
          template: 'audit_resend_result',
          recipient: order.quizSession.lead.email,
          status: 'logged',
          payload: {
            orderId: params.id,
            actor: (req as any).user?.sub ?? 'admin'
          }
        }
      });
      await sendResultEmailQueue.add(
        'send_result_email',
        { kind: 'result_unlock', orderId: params.id },
        resultUnlockEmailJobOpts
      );
      return { ok: true as const, enqueued: true as const };
    });

    protectedRoutes.get('/metrics', async () => {
      const [totalOrders, paidOrders, totalRevenueAgg] = await Promise.all([
        prisma.order.count(),
        prisma.order.count({ where: { status: 'paid' } }),
        prisma.order.aggregate({ _sum: { amountCents: true }, where: { status: 'paid' } })
      ]);
      return {
        totalOrders,
        paidOrders,
        conversionRate: totalOrders > 0 ? Number(((paidOrders / totalOrders) * 100).toFixed(2)) : 0,
        paidRevenueCents: totalRevenueAgg._sum.amountCents ?? 0
      };
    });

    protectedRoutes.get('/email-logs', async () =>
      prisma.emailLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100
      })
    );

    protectedRoutes.get('/pixel-events', async () =>
      prisma.pixelEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100
      })
    );

    const settingsSchema = z.object({
      cajuPay: z
        .object({
          baseUrl: z.string().url().optional(),
          apiKey: z.string().optional(),
          apiSecret: z.string().optional()
        })
        .optional(),
      smtp: z
        .object({
          host: z.string().optional(),
          port: z.number().int().optional(),
          user: z.string().optional(),
          pass: z.string().optional(),
          from: z.string().optional()
        })
        .optional(),
      pixel: z
        .object({
          provider: z.string().optional(),
          token: z.string().optional(),
          enabled: z.boolean().optional(),
          metaPixelId: z.string().optional(),
          metaAccessToken: z.string().optional(),
          metaTestEventCode: z.string().optional()
        })
        .optional()
    });

    protectedRoutes.get('/settings', async () => {
      const rows = await prisma.adminSetting.findMany();
      const byKey = new Map<string, Record<string, unknown>>(
        rows.map((r: { key: string; value: unknown }) => [r.key, (r.value ?? {}) as Record<string, unknown>])
      );
      const caju = (byKey.get('cajupay') ?? {}) as Record<string, unknown>;
      const smtp = (byKey.get('smtp') ?? {}) as Record<string, unknown>;
      const pixel = (byKey.get('pixel') ?? {}) as Record<string, unknown>;

      const mask = (value?: unknown) => {
        if (typeof value !== 'string' || value.length === 0) return '';
        if (value.length <= 6) return '******';
        return `${value.slice(0, 3)}***${value.slice(-2)}`;
      };

      return {
        cajuPay: {
          baseUrl: (caju.baseUrl as string | undefined) ?? '',
          apiKeyMasked: mask(caju.apiKey),
          apiSecretMasked: mask(caju.apiSecret)
        },
        smtp: {
          host: (smtp.host as string | undefined) ?? '',
          port: (smtp.port as number | string | undefined) ?? '',
          user: (smtp.user as string | undefined) ?? '',
          passMasked: mask(smtp.pass),
          from: (smtp.from as string | undefined) ?? ''
        },
        pixel: {
          provider: (pixel.provider as string | undefined) ?? '',
          tokenMasked: mask(pixel.token),
          enabled: (pixel.enabled as boolean | undefined) ?? false,
          metaPixelId: (pixel.metaPixelId as string | undefined) ?? '',
          metaAccessTokenMasked: mask(pixel.metaAccessToken),
          metaTestEventCode: (pixel.metaTestEventCode as string | undefined) ?? ''
        }
      };
    });

    protectedRoutes.post('/smtp/test-email', async (req, reply) => {
      const body = z
        .object({
          to: z.string().email(),
          host: z.string().optional(),
          port: z.union([z.number(), z.string()]).optional(),
          user: z.string().optional(),
          pass: z.string().optional(),
          from: z.string().optional()
        })
        .parse(req.body);

      let portNum: number | undefined;
      if (body.port !== undefined && body.port !== '') {
        portNum = typeof body.port === 'number' ? body.port : parseInt(String(body.port), 10);
        if (Number.isNaN(portNum)) portNum = undefined;
      }

      const resolved = await resolveSmtpConfig({
        host: body.host,
        port: portNum,
        user: body.user,
        pass: body.pass && body.pass.length > 0 ? body.pass : undefined,
        from: body.from
      });

      if (!resolved.ok) {
        return reply.code(400).send({ ok: false, error: resolved.error });
      }

      try {
        const sendResult = await sendMailWithResolvedSmtp(resolved.config, {
          to: body.to,
          subject: 'Nivel7 — E-mail de teste SMTP',
          text: 'Se voce recebeu esta mensagem, a configuracao SMTP do painel esta a funcionar.',
          footerNote: `Referencia do teste (UTC): ${new Date().toISOString()}`
        });
        await prisma.emailLog.create({
          data: {
            template: 'smtp_test',
            recipient: body.to,
            status: 'sent',
            providerId: sendResult.messageId ?? null,
            payload: {
              source: 'admin_smtp_test',
              configuredFrom: resolved.config.from,
              effectiveFrom: sendResult.effectiveFrom,
              accepted: sendResult.accepted,
              rejected: sendResult.rejected,
              smtpResponse: sendResult.smtpResponse
            }
          }
        });
        return {
          ok: true as const,
          messageId: sendResult.messageId ?? null,
          configuredFrom: resolved.config.from,
          effectiveFrom: sendResult.effectiveFrom,
          accepted: sendResult.accepted,
          rejected: sendResult.rejected,
          smtpResponse: sendResult.smtpResponse ?? null
        };
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        if (
          message === 'smtp_from_domain_invalid' ||
          message === 'smtp_from_must_match_user' ||
          message === 'smtp_user_requires_email'
        ) {
          return reply.code(400).send({ ok: false, error: message });
        }
        await prisma.emailLog.create({
          data: {
            template: 'smtp_test',
            recipient: body.to,
            status: 'failed',
            payload: { source: 'admin_smtp_test', error: message }
          }
        });
        return reply.status(502).send({ ok: false, error: 'smtp_send_failed', message });
      }
    });

    protectedRoutes.put('/settings', async (req, reply) => {
      const body = settingsSchema.parse(req.body);
      if (body.smtp) {
        const current = await prisma.adminSetting.findUnique({ where: { key: 'smtp' } });
        const currentValue = ((current?.value ?? {}) as Record<string, unknown>) || {};
        const merged = { ...currentValue, ...body.smtp } as Record<string, unknown>;
        const userStr = typeof merged.user === 'string' ? merged.user.trim() : '';
        const ub = userStr ? extractBareEmail(userStr) ?? userStr.toLowerCase() : '';
        if (ub?.includes('@')) {
          body.smtp = { ...body.smtp, from: ub };
        }
      }
      const updates = [
        ['cajupay', body.cajuPay],
        ['smtp', body.smtp],
        ['pixel', body.pixel]
      ] as const;

      await Promise.all(
        updates
          .filter(([, value]) => value !== undefined)
          .map(async ([key, value]) => {
            const current = await prisma.adminSetting.findUnique({ where: { key } });
            const currentValue = ((current?.value ?? {}) as Record<string, unknown>) || {};
            const nextEntries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined);
            const merged = { ...currentValue, ...Object.fromEntries(nextEntries) };

            return prisma.adminSetting.upsert({
              where: { key },
              update: { value: merged as object },
              create: { key, value: merged as object }
            });
          })
      );

      return { ok: true };
    });

    protectedRoutes.post('/jobs/reconcile-payments', async () => {
      await reconcilePaymentQueue.add('reconcile_payments', {}, { attempts: 3, backoff: { type: 'exponential', delay: 1000 } });
      return { enqueued: true };
    });

    protectedRoutes.get('/integrations/status', async () => {
      return {
        smtpConfigured: Boolean(process.env.SMTP_HOST),
        cajuPayConfigured: Boolean(process.env.CAJUPAY_API_KEY && process.env.CAJUPAY_API_SECRET),
        pixelConfigured: true
      };
    });
  });
}
