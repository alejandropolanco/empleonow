# syntax=docker/dockerfile:1.7
# EmpleoNow — imagen multi-stage para frontend (Nginx) y API (Node 20 LTS).

# ───────────────────────── Frontend (Vite + PWA) ─────────────────────────
FROM node:20-alpine AS web-build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html tsconfig.json vite.config.ts ./
COPY public ./public
COPY src ./src

# La site key de Turnstile se inyecta en build time; si falta, el widget
# simplemente no se renderiza y el backend opera en modo bypass.
ARG VITE_TURNSTILE_SITE_KEY=""
ENV VITE_TURNSTILE_SITE_KEY=$VITE_TURNSTILE_SITE_KEY

RUN npm run build

FROM nginx:1.27-alpine AS web
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=web-build /app/dist /usr/share/nginx/html
EXPOSE 80

# ───────────────────────── API (Express + Prisma) ─────────────────────────
FROM node:20-alpine AS api-build
WORKDIR /app

RUN apk add --no-cache openssl

COPY server/package.json server/package-lock.json ./
RUN npm ci

COPY server/prisma ./prisma
COPY server/prisma.config.ts server/tsconfig.json ./
COPY server/src ./src

RUN npx prisma generate \
  && npm run build \
  && npm prune --omit=dev

FROM node:20-alpine AS api
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl \
  && mkdir -p /app/uploads \
  && chown -R node:node /app

COPY --chown=node:node --from=api-build /app/node_modules ./node_modules
COPY --chown=node:node --from=api-build /app/dist ./dist
COPY --chown=node:node --from=api-build /app/prisma ./prisma
COPY --chown=node:node --from=api-build /app/prisma.config.ts ./prisma.config.ts
COPY --chown=node:node --from=api-build /app/package.json ./package.json

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["sh", "-c", "npx prisma generate && npx prisma migrate deploy && node dist/index.js"]
