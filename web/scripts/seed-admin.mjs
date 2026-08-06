/**
 * One-time script to seed the admin user into local D1.
 * Usage: node scripts/seed-admin.mjs
 */
import { execSync } from "node:child_process";

const EMAIL = "admin@highbury.com";
const PASSWORD = "HighburyAdmin123!";
const FULL_NAME = "Admin";

// --- hash password (same PBKDF2-SHA256 logic as lib/crypto.ts) ---
const encoder = new TextEncoder();
const salt = crypto.getRandomValues(new Uint8Array(16));
const keyMaterial = await crypto.subtle.importKey(
  "raw",
  encoder.encode(PASSWORD),
  "PBKDF2",
  false,
  ["deriveBits"],
);
const derived = await crypto.subtle.deriveBits(
  { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
  keyMaterial,
  256,
);
const toHex = (buf) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const passwordHash = toHex(derived);
const passwordSalt = toHex(salt);

function run(sql) {
  execSync(
    `npx wrangler d1 execute highbury-lounge-d1 --local --config wrangler.migrate.toml --persist-to .wrangler/state --command "${sql}"`,
    { cwd: process.cwd(), stdio: "inherit" },
  );
}

console.log("Seeding admin user...");
run(`DELETE FROM admin_users WHERE email = '${EMAIL}'`);
run(`INSERT INTO admin_users (email, full_name, password_hash, password_salt, role_id, is_active) VALUES ('${EMAIL}', '${FULL_NAME}', '${passwordHash}', '${passwordSalt}', (SELECT id FROM roles WHERE key = 'administrator'), 1)`);
console.log(`\n✅ Admin user created: ${EMAIL}`);
