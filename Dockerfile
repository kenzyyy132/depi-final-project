# Night Ops Scheduler — production image (web app + API in one service, single origin).
# Build:  docker build -t night-ops-scheduler .
# Run:    docker run -p 8080:8080 -e DATABASE_URL=... -e APP_URL=https://your-domain night-ops-scheduler

# ---- 1. Build the React app ----
FROM node:22-bookworm-slim AS web
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js tailwind.config.js postcss.config.js ./
COPY src ./src
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---- 2. Install the API (production dependencies + Prisma client) ----
FROM node:22-bookworm-slim AS api
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
COPY server/prisma ./prisma
RUN npm ci --omit=dev

# ---- 3. Runtime ----
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
    PORT=8080 \
    SERVE_CLIENT=true \
    TRUST_PROXY=1
WORKDIR /app/server
COPY --from=api /app/server/node_modules ./node_modules
COPY server/package.json ./
COPY server/prisma ./prisma
COPY server/src ./src
COPY --from=web /app/dist /app/dist
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Apply pending database migrations, then start the server.
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node src/index.js"]
