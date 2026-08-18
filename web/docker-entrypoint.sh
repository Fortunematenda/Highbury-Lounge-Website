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
  [ -n "${PAYNOW_INTEGRATION_ID:-}" ] && echo "PAYNOW_INTEGRATION_ID=${PAYNOW_INTEGRATION_ID}"
  [ -n "${PAYNOW_INTEGRATION_KEY:-}" ] && echo "PAYNOW_INTEGRATION_KEY=${PAYNOW_INTEGRATION_KEY}"
  [ -n "${SEED_KEY:-}" ] && echo "SEED_KEY=${SEED_KEY}"
  [ -n "${SMTP_HOST:-}" ] && echo "SMTP_HOST=${SMTP_HOST}"
  [ -n "${SMTP_PORT:-}" ] && echo "SMTP_PORT=${SMTP_PORT}"
  [ -n "${SMTP_USER:-}" ] && echo "SMTP_USER=${SMTP_USER}"
  [ -n "${SMTP_PASS:-}" ] && echo "SMTP_PASS=${SMTP_PASS}"
  [ -n "${SMTP_FROM:-}" ] && echo "SMTP_FROM=${SMTP_FROM}"
} > /app/.dev.vars

# Apply pending D1 migrations against the same persist path the app uses.
# Missing tables (e.g. food_orders) cause opaque Server Component errors in prod.
if [ -f wrangler.migrate.toml ] && [ -d drizzle ]; then
  echo "Applying local D1 migrations..."
  npx wrangler d1 migrations apply highbury-lounge-d1 --local \
    --config wrangler.migrate.toml \
    --persist-to .wrangler/state \
    || echo "WARNING: D1 migration apply failed — check logs; app will still start."
fi

exec npx wrangler dev \
  --config dist/server/wrangler.json \
  --local \
  --ip 0.0.0.0 \
  --port 3000 \
  --persist-to .wrangler/state \
  --var "COOKIE_SECURE:${COOKIE_SECURE}"
