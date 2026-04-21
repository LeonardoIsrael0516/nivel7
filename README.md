# Nivel7

Monorepo do produto Nivel7 com frontend e backend.

## Estrutura
- `frontend/` -> app do quiz e ofertas
- `backend/` -> API Fastify, admin, pagamentos e filas
- `docker-compose.yml` -> MySQL + Redis + backend

## Rodando local
1. Infra:
   - `docker compose up -d mysql redis`
2. Backend:
   - copiar `backend/.env.example` para `backend/.env`
   - `cd backend`
   - `npm install`
   - `npm run db:generate`
   - `npm run db:migrate`
   - `npm run db:seed`
   - `npm run dev`
3. Frontend:
   - criar `frontend/.env` com `VITE_API_BASE_URL=http://localhost:4000/api`
   - `cd frontend`
   - `npm install`
   - `npm run dev`

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
