#!/usr/bin/env node
/**
 * Node SMTP proxy so booking emails work when the Worker runtime
 * cannot open outbound SMTP sockets (wrangler / workerd).
 *
 * POST /send  JSON: { to, toName?, subject, text, from? }
 * GET  /health
 * GET  /verify — SMTP verify() against configured mailbox
 */
const http = require("http");
const nodemailer = require("nodemailer");

const PORT = Number(process.env.SMTP_PROXY_PORT || 3011);

function smtpConfig() {
  const host = (process.env.SMTP_HOST || "").trim();
  const user = (process.env.SMTP_USER || "").trim();
  const pass = (process.env.SMTP_PASS || "").trim();
  const port = Number(process.env.SMTP_PORT || "465") || 465;
  const secure =
    process.env.SMTP_SECURE === "true" ||
    process.env.SMTP_SECURE === "1" ||
    port === 465;
  const from =
    (process.env.SMTP_FROM || "").trim() ||
    (user ? `"Highbury Lounge" <${user}>` : "");
  return { host, user, pass, port, secure, from };
}

function createTransport() {
  const { host, user, pass, port, secure } = smtpConfig();
  if (!host || !user || !pass) {
    const err = new Error("SMTP is not configured");
    err.code = "UNCONFIGURED";
    throw err;
  }
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: {
      // Keep the certificate hostname even when SMTP_HOST is host.docker.internal
      servername: (
        process.env.SMTP_TLS_SERVERNAME ||
        process.env.SMTP_HOST ||
        host
      ).trim(),
      minVersion: "TLSv1.2",
      // Docker → host mail: set SMTP_TLS_REJECT_UNAUTHORIZED=0 if cert hostname mismatches
      rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== "0",
    },
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 30_000,
  });
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

const server = http.createServer(async (req, res) => {
  const json = (status, body) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };

  try {
    if (req.method === "GET" && req.url === "/health") {
      const cfg = smtpConfig();
      return json(200, {
        ok: true,
        smtpConfigured: Boolean(cfg.host && cfg.user && cfg.pass),
        host: cfg.host || null,
        port: cfg.port,
      });
    }

    if (req.method === "GET" && req.url === "/verify") {
      try {
        const transporter = createTransport();
        await transporter.verify();
        return json(200, { ok: true });
      } catch (err) {
        return json(502, {
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (req.method === "POST" && req.url === "/send") {
      const body = await readJson(req);
      const to = String(body.to || "").trim();
      const subject = String(body.subject || "").trim();
      const text = String(body.text || "");
      if (!to || !subject) {
        return json(400, { ok: false, error: "to and subject are required" });
      }

      const cfg = smtpConfig();
      const transporter = createTransport();
      const info = await transporter.sendMail({
        from: body.from || cfg.from,
        to: body.toName
          ? `"${String(body.toName).replace(/"/g, "")}" <${to}>`
          : to,
        replyTo: cfg.user,
        subject,
        text,
      });
      return json(200, {
        ok: true,
        messageId: info.messageId || null,
      });
    }

    return json(404, { error: "Not found" });
  } catch (err) {
    const status = err && err.code === "UNCONFIGURED" ? 503 : 500;
    return json(status, {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`SMTP Node proxy listening on 127.0.0.1:${PORT}`);
});
