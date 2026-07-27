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
