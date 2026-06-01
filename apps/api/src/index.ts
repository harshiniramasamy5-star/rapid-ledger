import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { createServer } from "node:http";
import { logger } from "@bogeychan/elysia-logger";
import { authRoutes } from "./routes/auth.routes";
import { documentRoutes } from "./routes/document.routes";
import { ledgerRoutes } from "./routes/ledger.routes";
import { userRoutes } from "./routes/user.routes";
import { approvalRoutes } from "./routes/approval.routes";
import { auditRoutes } from "./routes/audit.routes";

export const app = new Elysia()
  .use(cors({
    origin: ["https://rapid-ledger.vercel.app", "http://localhost:3000"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
  }))

  // ── elysia-logger: logs every request + response automatically ──
  .use(logger({
    level: "debug",
    autoLogging: true,
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:HH:MM:ss",
        ignore: "pid,hostname",
        singleLine: false,
      }
    }
  }))

  .get("/health", ({ log }) => {
    log.info("Health check");
    return { status: "ok", timestamp: new Date().toISOString() };
  })

  .use(authRoutes)
  .use(documentRoutes)
  .use(ledgerRoutes)
  .use(userRoutes)
  .use(approvalRoutes)
  .use(auditRoutes)

  // ── Catch unmatched routes ──────────────────────────────────────
  .all("*", ({ request, set, log }) => {
    const path = new URL(request.url).pathname;
    set.status = 404;
    log.warn({ method: request.method, path }, `🚫 NO ROUTE: ${request.method} ${path}`);
    console.warn(`\n🚫 NO ROUTE MATCHED: ${request.method} ${path}\n`);
    return { error: { code: "NOT_FOUND", message: `No route: ${request.method} ${path}` } };
  })

  // ── Global error handler ────────────────────────────────────────
  .onError(({ error, set, request, code, log }) => {
    const path = new URL(request.url).pathname;

    log.error({
      code,
      method: request.method,
      path,
      message: error.message,
      stack: error.stack,
    }, `❌ ERROR [${code}] ${request.method} ${path}`);

    console.error(`\n${"━".repeat(50)}`);
    console.error(`❌ ERROR CODE : ${code}`);
    console.error(`📍 PATH       : ${request.method} ${path}`);
    console.error(`💬 MESSAGE    : ${error.message}`);
    console.error(`📚 STACK      :\n${error.stack}`);
    console.error(`${"━".repeat(50)}\n`);

    try {
      const parsed = JSON.parse((error as { message?: string }).message ?? "{}") as { error: { code: string; message: string } };
      if (parsed.error) return parsed;
    } catch { /* not structured */ }

    if (code === "NOT_FOUND") {
      set.status = 404;
      return { error: { code: "NOT_FOUND", message: `Route not found: ${request.method} ${path}` } };
    }

    set.status = 500;
    return { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } };
  });

if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.PORT) || 3001;
  createServer(async (req, res) => {
    const rawUrl = req.url || "/";
    const strippedUrl = rawUrl.startsWith("/api") ? rawUrl.slice(4) || "/" : rawUrl;
    console.log(`🌐 ${req.method} ${rawUrl} → ${strippedUrl}`);
    const url = "http://localhost" + strippedUrl;
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const request = new Request(url, {
      method: req.method,
      headers: req.headers as HeadersInit,
      body: body && req.method !== "GET" && req.method !== "HEAD" ? body : undefined,
    });
    const response = await app.handle(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  }).listen(port, () => {
    console.log(`\n🚀 RAPID Ledger API with elysia-logger running on http://localhost:${port}\n`);
  });
}
// This file has been patched for Railway logging
