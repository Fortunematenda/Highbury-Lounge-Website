#!/usr/bin/env node
/**
 * Tiny Node proxy so Paynow initiate works when the Worker runtime
 * cannot make outbound HTTPS (wrangler local "Network connection lost").
 */
const http = require("http");
const { URL } = require("url");

const PORT = Number(process.env.PAYNOW_PROXY_PORT || 3010);
const INITIATE_URL = "https://www.paynow.co.zw/interface/initiatetransaction";

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.method === "POST" && req.url === "/initiate") {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = Buffer.concat(chunks).toString("utf8");

      const upstream = await fetch(INITIATE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "*/*",
        },
        body,
      });
      const text = await upstream.text();
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(text);
      return;
    }

    if (req.method === "GET" && req.url?.startsWith("/probe")) {
      try {
        const probe = await fetch("https://www.paynow.co.zw/", {
          method: "GET",
          redirect: "follow",
        });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            ok: true,
            status: probe.status,
            via: "node-proxy",
          }),
        );
      } catch (err) {
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      }
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Paynow Node proxy listening on 127.0.0.1:${PORT}`);
});
