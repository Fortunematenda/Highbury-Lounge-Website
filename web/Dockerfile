FROM node:22-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends bash ca-certificates coreutils \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY scripts ./scripts
RUN chmod +x scripts/*.sh && npm ci

COPY . .
RUN chmod +x scripts/*.sh && npm run build

FROM node:22-bookworm-slim AS production
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends bash ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV WRANGLER_LOG_PATH=.wrangler/wrangler.log

COPY --from=builder /app /app

EXPOSE 3000
CMD ["npm", "run", "start"]
