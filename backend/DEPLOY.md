# Deploy do backend Nivel7

## Instalacao automatica na VPS (Docker) — recomendado

Com o repositorio publico no GitHub (troque `USUARIO` e `REPO`):

```bash
sudo NIVEL7_REPO_URL=https://github.com/LeonardoIsrael0516/nivel7.git bash -c "$(curl -fsSL https://raw.githubusercontent.com/LeonardoIsrael0516/nivel7/main/scripts/vps-docker-install.sh)"
```

O script instala Docker/Compose, pergunta URLs do backend e frontend, configura MySQL/Redis via `docker-compose.yml`, gera **JWT** e cria o `backend/.env`. Depois sobe `backend` + `worker` + `mysql` + `redis` e executa `prisma migrate deploy` + `db:seed`.

### Porta publica do backend

Para evitar problemas com proxy/CDN (Cloudflare) em portas nao padrao, publique a API em **80** (HTTP) e use HTTPS no proxy (Caddy/Nginx) ou no CDN.

### Variavel importante no frontend

No build/deploy do frontend, configure:

- `VITE_API_BASE_URL=https://SEU_BACKEND/api`

## Instalacao automatica na VPS (Ubuntu/Debian) — sem Docker

Com o repositorio publico no GitHub (troque `USUARIO` e `REPO`):

```bash
sudo NIVEL7_REPO_URL=https://github.com/USUARIO/REPO.git bash -c "$(curl -fsSL https://raw.githubusercontent.com/USUARIO/REPO/main/scripts/vps-install.sh)"
```

O script pergunta URLs do backend e frontend, porta interna, MySQL, admin, CajuPay/SMTP opcionais, gera **JWT** aleatorios e escreve o `.env`. Depois: `npm ci`, build, `prisma migrate deploy`, `db:seed` e unidades **systemd** `nivel7-api` e `nivel7-worker`.

Requisitos: VPS Ubuntu ou Debian, acesso **root/sudo**, dominio (ou IP) ja apontando se for usar HTTPS no proxy.

## Processos obrigatorios

1. **API HTTP** — `npm start` (ou `npm run dev` em desenvolvimento): serve `src/server.ts`.
2. **Worker BullMQ** — `npm run worker` (ou `npm run dev:worker`): executa `src/worker.ts` e processa filas (e-mail de resultado apos pagamento, criacao de PIX em fila, reconciliacao CajuPay, pixel).

Sem o **worker**, os jobs ficam na fila Redis e **o e-mail de desbloqueio do resultado nao e enviado**.

## Variaveis criticas

- **`FRONTEND_BASE_URL`**: URL publica do site (ex. `https://app.seudominio.com`). O link no e-mail pos-compra usa esta base; se estiver errada, o cliente abre um host invalido. Em desenvolvimento local com Vite na porta **8080**, use `http://localhost:8080` (o default do schema no `env.ts` tambem e 8080).
- **SMTP** (painel admin ou `.env`): utilizador SMTP = remetente; Redis e MySQL acessiveis ao mesmo `DATABASE_URL` / `REDIS_URL` na API e no worker.

## Docker

O `docker-compose.yml` na raiz do repo inclui o servico `worker` com o mesmo `env_file` que o `backend`. Suba `backend` e `worker` juntos com Redis e MySQL.
