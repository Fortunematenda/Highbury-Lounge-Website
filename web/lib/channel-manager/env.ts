/**
 * Shared env reader (Worker bindings + process.env), same pattern as Paynow.
 */
export function readServerEnv(name: string): string {
  const fromProcess =
    typeof process !== "undefined" ? (process.env[name] || "").trim() : "";
  if (fromProcess) return fromProcess;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { env } = require("cloudflare:workers") as {
      env?: Record<string, string | undefined>;
    };
    return String(env?.[name] ?? "").trim();
  } catch {
    return "";
  }
}

export function isTruthyEnv(raw: string): boolean {
  const v = raw.toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}
