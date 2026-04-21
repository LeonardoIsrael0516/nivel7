# Nivel7

Monorepo do produto Nivel7 com frontend e backend.

## Estrutura
- `frontend/` -> app do quiz e ofertas
- `backend/` -> API Fastify, admin, pagamentos e filas
- `docker-compose.yml` -> MySQL + Redis + backend + worker

## Rodando local (recomendado)

### 1) Infra + backend + worker (Docker)

1. Copie `backend/.env.example` para `backend/.env` e ajuste `DATABASE_URL` e `REDIS_URL` para containers:
   - `DATABASE_URL=mysql://nivel7:nivel7@mysql:3306/nivel7?sslaccept=accept_invalid_certs`
   - `REDIS_URL=redis://redis:6379`
2. Suba tudo:
   - `docker compose up -d --build`
3. Rode migrations/seed (uma vez):
   - `docker compose exec -T backend npx prisma migrate deploy`
   - `docker compose exec -T backend npm run db:seed`

Sem o **worker**, o pós-pagamento pode não liberar resultado por e-mail.

### 2) Frontend (Vite)

1. Crie `frontend/.env` (ou use `frontend/.env.example`) com a API local:
   - `VITE_API_BASE_URL=http://localhost:4000/api`
2. Rode:
   - `cd frontend`
   - `npm install`
   - `npm run dev`

## Deploy (VPS Docker)

Veja `backend/DEPLOY.md` e o instalador `scripts/vps-docker-install.sh`.

## Deploy do frontend na Vercel

- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `.output`
- **Env**:
  - `VITE_API_BASE_URL=https://SEU_BACKEND/api`

O arquivo `frontend/vercel.json` já inclui o `outputDirectory` para Vercel (TanStack Start + Nitro).

## Rotas admin no frontend
- `/admin/login`
- `/admin`

## Integração CajuPay
Configurar no backend:
- `CAJUPAY_BASE_URL`
- `CAJUPAY_API_KEY`
- `CAJUPAY_API_SECRET`

## Observações
- O checkout final pode ser acoplado na etapa de oferta.
- Reconciliacao de pagamentos está pronta por fila/job com Redis.
