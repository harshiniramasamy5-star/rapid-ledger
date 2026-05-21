import type { IncomingMessage, ServerResponse } from "http";

export default function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({
    status: "ok",
    service: "rapid-ledger-api",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    message: "API is live on Vercel. SQLite routes need a cloud DB to work fully."
  }));
}
