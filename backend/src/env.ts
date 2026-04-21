import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  APP_ORIGINS: z.string().default('http://localhost:8080,http://localhost:3000'),
  FRONTEND_BASE_URL: z.string().url().default('http://localhost:8080'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(8),
  CAJUPAY_BASE_URL: z.string().url().optional(),
  CAJUPAY_API_KEY: z.string().optional(),
  CAJUPAY_API_SECRET: z.string().optional(),
  CAJUPAY_WEBHOOK_SECRET: z.string().optional(),
  /** CPF somente digitos (11) usado na criacao PIX quando o lead nao tem documento; sandbox / testes. */
  CAJUPAY_DEFAULT_CONSUMER_DOCUMENT: z
    .string()
    .regex(/^\d{11}$/)
    .optional()
    .describe('CPF 11 digitos para consumer na API CajuPay PIX'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional()
});

const parsed = schema.parse(process.env);

export const env = {
  ...parsed,
  APP_ORIGINS_LIST: parsed.APP_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
};
