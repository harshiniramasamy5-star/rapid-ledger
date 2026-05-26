import { Elysia } from "elysia";
import { createServer } from "node:http";
import { authRoutes } from "./routes/auth.routes";
import { documentRoutes } from "./routes/document.routes";
import { ledgerRoutes } from "./routes/ledger.routes";
import { userRoutes } from "./routes/user.routes";
import { auditRoutes } from "./routes/audit.routes";

export const app = new Elysia()
  .get("/health", () => ({ status: "ok", timestamp: new Date().toISOString() }))
  .use(authRoutes)
  .use(documentRoutes)
  .use(ledgerRoutes)
  .use(userRoutes)
  .use(auditRoutes)
  .onError(({ error, set }) => {
    try {
      const parsed = JSON.parse((error as { message?: string }).message ?? "{}") as { error: { code: string; message: string } };
      if (parsed.error) return parsed;
    } catch { /* not a structured error */ }
    console.error("[api error]", error);
    set.status = 500;
    return { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } };
  });

if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.PORT) || 3001;
  createServer(async (req, res) => {
    const url = `http://localhost${req.url}`;
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
  }).listen(port, () => console.log(`🚀 API running on http://localhost:${port}`));
}
