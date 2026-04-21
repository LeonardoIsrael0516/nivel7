import { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma.js';
import { redis } from '../../lib/redis.js';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => {
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    return { ok: true };
  });
}
