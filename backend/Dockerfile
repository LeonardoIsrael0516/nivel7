FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
# Garante devDependencies (tsc/prisma) para build
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

# Mantem node_modules do builder (inclui prisma client gerado)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
# Necessario para `npm run db:seed` (tsx executa `prisma/seed.ts` que importa `src/*`)
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./tsconfig.json

EXPOSE 4000

CMD ["node", "dist/server.js"]
