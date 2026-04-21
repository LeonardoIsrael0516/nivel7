import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { FastifyInstance } from 'fastify';
import { env } from '../env.js';

export async function securityPlugins(app: FastifyInstance) {
  // API e consumida por um frontend em outro dominio; CORP same-origin quebra fetch mesmo com CORS.
  await app.register(helmet, {
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  });
  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) {
        cb(null, true);
        return;
      }
      cb(null, env.APP_ORIGINS_LIST.includes(origin));
    },
    credentials: true
  });
  await app.register(rateLimit, {
    max: 120,
    timeWindow: '1 minute'
  });
}
