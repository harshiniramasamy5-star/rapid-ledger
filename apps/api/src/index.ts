import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { createServer } from "node:http";
import { authRoutes } from "./routes/auth.routes";
import { documentRoutes } from "./routes/document.routes";
import { ledgerRoutes } from "./routes/ledger.routes";
import { userRoutes } from "./routes/user.routes";
import { approvalRoutes } from "./routes/approval.routes";
import { aiRoutes } from "./routes/ai.routes";
import { auditRoutes } from "./routes/audit.routes";

export const app = new Elysia()
  .use(cors({
    origin: ["https://rapid-ledger.vercel.app", "http://localhost:3000"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
  }))
  .onRequest(({ request }) => {
    const url = new URL(request.url);
    console.log(`📥 ${request.method} ${url.pathname}`);
  })
  .onAfterResponse(({ request, set }) => {
    const url = new URL(request.url);
    const status = Number(set.status ?? 200);
    const icon = status >= 500 ? "💥" : status >= 400 ? "⚠️" : "✅";
    console.log(`${icon} ${request.method} ${url.pathname} → ${status}`);
  })
  .get("/health", () => ({ status: "ok", timestamp: new Date().toISOString() }))
  .post("/ai/chat", async ({ body, set }) => {
    const { messages } = body as { messages: { role: string; content: string }[] };
    const apiKey = process.env.MINIMAX_API_KEY;
    if (!apiKey) {
      set.status = 500;
      return { error: { code: "MISSING_KEY", message: "MINIMAX_API_KEY not set in .env" } };
    }
    const response = await fetch("https://api.minimax.chat/v1/text/chatcompletion_v2", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ model: "abab6.5s-chat", messages })
    });
    const data = await response.json() as { choices: { message: { content: string } }[] };
    return { reply: data.choices[0].message.content };
  })
  .use(aiRoutes)
  .use(authRoutes)
  .use(documentRoutes)
  .use(ledgerRoutes)
  .use(userRoutes)
  .use(approvalRoutes)
  .use(auditRoutes)
  .use(new Elysia({ prefix: "/admin" })
    .use(userRoutes)
    .use(documentRoutes)
    .use(ledgerRoutes)
    .use(approvalRoutes)
    .use(auditRoutes)
  )
  .all("*", ({ request, set }) => {
    const path = new URL(request.url).pathname;
    set.status = 404;
    console.warn(`🚫 NO ROUTE: ${request.method} ${path}`);
    return { error: { code: "NOT_FOUND", message: `No route: ${request.method} ${path}` } };
  })
  .onError(({ error, set, request, code }) => {
    const path = new URL(request.url).pathname;
    const err = error as unknown as { message?: string; stack?: string };
    const message = err.message ?? "Unknown error";
    const stack = err.stack ?? "No stack";
    console.error(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.error(`❌ ERROR CODE : ${code}`);
    console.error(`📍 PATH       : ${request.method} ${path}`);
    console.error(`💬 MESSAGE    : ${message}`);
    console.error(`📚 STACK      : ${stack}`);
    console.error(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    try {
      const parsed = JSON.parse(message) as { error: { code: string; message: string } };
      if (parsed.error) return parsed;
    } catch {}
    if (code === "NOT_FOUND") {
      set.status = 404;
      return { error: { code: "NOT_FOUND", message: `Route not found: ${request.method} ${path}` } };
    }
    set.status = 500;
    return { error: { code: "INTERNAL_ERROR", message } };
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
    console.log(`\n🚀 API running on http://localhost:${port}`);
    console.log(`✅ Routes: /auth /users /admin/users /documents /ledger /approvals /audit /ai/chat\n`);
  });
}
