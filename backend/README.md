# Backend Nivel7

API Fastify para fluxo de quiz, pedidos, pagamento PIX (CajuPay), admin e processamento assíncrono.

## Stack
- Fastify + TypeScript
- Prisma + MySQL
- Redis + BullMQ
- JWT + Argon2

## Pré-requisitos
- Node 22+
- Docker / Docker Compose

## Setup
1. Copie `.env.example` para `.env`.
2. Ajuste variáveis de ambiente (principalmente JWT e CajuPay).
3. Suba infraestrutura:
   - `docker compose up -d mysql redis`
4. Instale dependências:
   - `npm install`
5. Gere client e migrações:
   - `npm run db:generate`
   - `npm run db:migrate`
6. Seed inicial:
   - `npm run db:seed`
7. Rodar API:
   - `npm run dev`

## Endpoints principais
- `GET /api/health`
- `POST /api/leads`
- `POST /api/quiz-sessions`
- `POST /api/orders`
- `GET /api/payments/:orderId/status`
- `POST /api/webhooks/cajupay`

## Admin
- `POST /api/admin/auth/login`
- `GET /api/admin/plans`
- `POST /api/admin/plans`
- `PATCH /api/admin/plans/:id`
- `GET /api/admin/orders`
- `POST /api/admin/jobs/reconcile-payments`
- `GET /api/admin/integrations/status`

## Segurança já aplicada
- CORS restrito por `APP_ORIGIN`
- Helmet ativo
- Rate limit global + login admin com limite específico
- JWT para rotas admin
- Senha admin com Argon2
- Validação de payload com Zod
- Segredo CajuPay apenas no backend
- Idempotência no fluxo de pedido/cobrança
