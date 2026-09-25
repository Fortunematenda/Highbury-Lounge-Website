#!/bin/sh
set -eu
cd /app

# Dedupe compatibility flags (vite + wrangler merge can duplicate nodejs_compat)
node <<'NODE'
const fs = require("fs");
const path = "dist/server/wrangler.json";
const j = JSON.parse(fs.readFileSync(path, "utf8"));
if (Array.isArray(j.compatibility_flags)) {
  j.compatibility_flags = [...new Set(j.compatibility_flags)];
  fs.writeFileSync(path, JSON.stringify(j, null, 2));
  console.log("compatibility_flags =", j.compatibility_flags.join(", "));
}
NODE

# Avoid interactive wrangler prompts in Docker
export CI=true
export WRANGLER_SEND_METRICS=false
# Keep admin sessions working on plain HTTP unless explicitly enabled.
export COOKIE_SECURE="${COOKIE_SECURE:-false}"

# Sync selected env into .dev.vars so wrangler local exposes them to the Worker.
{
  echo "COOKIE_SECURE=${COOKIE_SECURE}"
  [ -n "${SITE_URL:-}" ] && echo "SITE_URL=${SITE_URL}"
  [ -n "${PUBLIC_SITE_URL:-}" ] && echo "PUBLIC_SITE_URL=${PUBLIC_SITE_URL}"
  echo "PAYNOW_ENABLED=${PAYNOW_ENABLED:-false}"
  [ -n "${PAYNOW_INTEGRATION_ID:-}" ] && echo "PAYNOW_INTEGRATION_ID=${PAYNOW_INTEGRATION_ID}"
  [ -n "${PAYNOW_INTEGRATION_KEY:-}" ] && echo "PAYNOW_INTEGRATION_KEY=${PAYNOW_INTEGRATION_KEY}"
  echo "BEDS24_ENABLED=${BEDS24_ENABLED:-false}"
  [ -n "${BEDS24_REFRESH_TOKEN:-}" ] && echo "BEDS24_REFRESH_TOKEN=${BEDS24_REFRESH_TOKEN}"
  [ -n "${BEDS24_PROPERTY_ID:-}" ] && echo "BEDS24_PROPERTY_ID=${BEDS24_PROPERTY_ID}"
  [ -n "${BEDS24_WEBHOOK_SECRET:-}" ] && echo "BEDS24_WEBHOOK_SECRET=${BEDS24_WEBHOOK_SECRET}"
  [ -n "${BEDS24_API_BASE_URL:-}" ] && echo "BEDS24_API_BASE_URL=${BEDS24_API_BASE_URL}"
  [ -n "${SEED_KEY:-}" ] && echo "SEED_KEY=${SEED_KEY}"
  [ -n "${SMTP_HOST:-}" ] && echo "SMTP_HOST=${SMTP_HOST}"
  [ -n "${SMTP_PORT:-}" ] && echo "SMTP_PORT=${SMTP_PORT}"
  [ -n "${SMTP_USER:-}" ] && echo "SMTP_USER=${SMTP_USER}"
  [ -n "${SMTP_PASS:-}" ] && echo "SMTP_PASS=${SMTP_PASS}"
  [ -n "${SMTP_FROM:-}" ] && echo "SMTP_FROM=${SMTP_FROM}"
} > /app/.dev.vars

echo "Paynow enabled: ${PAYNOW_ENABLED:-false}"
echo "Beds24 enabled: ${BEDS24_ENABLED:-false}"
echo "SMTP configured: $([ -n "${SMTP_HOST:-}" ] && [ -n "${SMTP_USER:-}" ] && [ -n "${SMTP_PASS:-}" ] && echo yes || echo no)"
echo "Paynow keys present: $([ -n "${PAYNOW_INTEGRATION_ID:-}" ] && [ -n "${PAYNOW_INTEGRATION_KEY:-}" ] && [ -n "${SITE_URL:-}" ] && echo yes || echo no)"
echo "SITE_URL=${SITE_URL:-<unset>}"

# Apply pending D1 migrations against the same persist path the app uses.
# Missing tables (e.g. food_orders) cause opaque Server Component errors in prod.
if [ -f wrangler.migrate.toml ] && [ -d drizzle ]; then
  echo "Applying local D1 migrations..."
  npx wrangler d1 migrations apply highbury-lounge-d1 --local \
    --config wrangler.migrate.toml \
    --persist-to .wrangler/state \
    || echo "WARNING: D1 migration apply failed — check logs; app will still start."
fi

# Node proxy for outbound Paynow HTTPS (wrangler local often cannot reach Paynow).
export PAYNOW_PROXY_PORT="${PAYNOW_PROXY_PORT:-3010}"
export PAYNOW_PROXY_URL="http://127.0.0.1:${PAYNOW_PROXY_PORT}"
node /app/scripts/paynow-proxy.cjs &
PROXY_PID=$!
sleep 1
if ! kill -0 "$PROXY_PID" 2>/dev/null; then
  echo "WARNING: Paynow Node proxy failed to start"
else
  echo "Paynow Node proxy started (pid $PROXY_PID) on ${PAYNOW_PROXY_URL}"
fi

# Node proxy for SMTP (Worker cannot reliably open mail sockets).
export SMTP_PROXY_PORT="${SMTP_PROXY_PORT:-3011}"
export SMTP_PROXY_URL="http://127.0.0.1:${SMTP_PROXY_PORT}"
node /app/scripts/smtp-proxy.cjs &
SMTP_PROXY_PID=$!
sleep 1
if ! kill -0 "$SMTP_PROXY_PID" 2>/dev/null; then
  echo "WARNING: SMTP Node proxy failed to start"
else
  echo "SMTP Node proxy started (pid $SMTP_PROXY_PID) on ${SMTP_PROXY_URL}"
fi

# Expose proxy URLs to the Worker (written after proxies start).
{
  echo "PAYNOW_PROXY_URL=${PAYNOW_PROXY_URL}"
  echo "SMTP_PROXY_URL=${SMTP_PROXY_URL}"
} >> /app/.dev.vars

# Also pass critical vars on the CLI so they are always available to the Worker.
WRANGLER_VARS="--var COOKIE_SECURE:${COOKIE_SECURE}"
[ -n "${SITE_URL:-}" ] && WRANGLER_VARS="$WRANGLER_VARS --var SITE_URL:${SITE_URL}"
WRANGLER_VARS="$WRANGLER_VARS --var PAYNOW_ENABLED:${PAYNOW_ENABLED:-false}"
[ -n "${PAYNOW_INTEGRATION_ID:-}" ] && WRANGLER_VARS="$WRANGLER_VARS --var PAYNOW_INTEGRATION_ID:${PAYNOW_INTEGRATION_ID}"
[ -n "${PAYNOW_INTEGRATION_KEY:-}" ] && WRANGLER_VARS="$WRANGLER_VARS --var PAYNOW_INTEGRATION_KEY:${PAYNOW_INTEGRATION_KEY}"
WRANGLER_VARS="$WRANGLER_VARS --var BEDS24_ENABLED:${BEDS24_ENABLED:-false}"
[ -n "${BEDS24_REFRESH_TOKEN:-}" ] && WRANGLER_VARS="$WRANGLER_VARS --var BEDS24_REFRESH_TOKEN:${BEDS24_REFRESH_TOKEN}"
[ -n "${BEDS24_PROPERTY_ID:-}" ] && WRANGLER_VARS="$WRANGLER_VARS --var BEDS24_PROPERTY_ID:${BEDS24_PROPERTY_ID}"
[ -n "${BEDS24_WEBHOOK_SECRET:-}" ] && WRANGLER_VARS="$WRANGLER_VARS --var BEDS24_WEBHOOK_SECRET:${BEDS24_WEBHOOK_SECRET}"
[ -n "${BEDS24_API_BASE_URL:-}" ] && WRANGLER_VARS="$WRANGLER_VARS --var BEDS24_API_BASE_URL:${BEDS24_API_BASE_URL}"
WRANGLER_VARS="$WRANGLER_VARS --var PAYNOW_PROXY_URL:${PAYNOW_PROXY_URL}"
WRANGLER_VARS="$WRANGLER_VARS --var SMTP_PROXY_URL:${SMTP_PROXY_URL}"

cleanup() {
  kill "$PROXY_PID" 2>/dev/null || true
  kill "$SMTP_PROXY_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# shellcheck disable=SC2086
APP_PORT="${PORT:-3000}"
exec npx wrangler dev \
  --config dist/server/wrangler.json \
  --local \
  --ip 0.0.0.0 \
  --port "${APP_PORT}" \
  --persist-to .wrangler/state \
  $WRANGLER_VARS
