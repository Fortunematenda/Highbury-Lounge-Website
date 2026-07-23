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

exec npx wrangler dev \
  --config dist/server/wrangler.json \
  --local \
  --ip 0.0.0.0 \
  --port 3000 \
  --persist-to .wrangler/state \
  --var "COOKIE_SECURE:${COOKIE_SECURE}"
