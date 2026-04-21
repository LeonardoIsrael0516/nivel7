import Fastify from 'fastify';
import sensible from '@fastify/sensible';
import jwt from '@fastify/jwt';
import { env } from './env.js';
import { securityPlugins } from './plugins/security.js';
import { healthRoutes } from './modules/health/routes.js';
import { publicRoutes } from './modules/public/routes.js';
import { adminRoutes } from './modules/admin/routes.js';
import { webhookRoutes } from './modules/webhooks/routes.js';

export async function buildServer() {
  const app = Fastify({
    logger: true
  });

  await app.register(sensible);
  await app.register(jwt, {
    secret: env.JWT_ACCESS_SECRET
  });
  await securityPlugins(app);

  await app.register(healthRoutes, { prefix: '/api' });
  await app.register(publicRoutes, { prefix: '/api' });
  await app.register(webhookRoutes, { prefix: '/api' });
  await app.register(adminRoutes, { prefix: '/api/admin' });

  return app;
}

const app = await buildServer();
await app.listen({ host: '0.0.0.0', port: env.PORT });
