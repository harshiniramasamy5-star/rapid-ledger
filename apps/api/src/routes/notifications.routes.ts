import { Elysia } from "elysia";
import { verifyToken } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { subscribe } from "../services/sse.service";

// EventSource can't send custom headers, so the token travels as a query
// param here instead of the usual Authorization header used everywhere else.
export const notificationRoutes = new Elysia({ prefix: "/notifications" }).get(
  "/stream",
  async ({ query, set, request }) => {
    const token = typeof query.token === "string" ? query.token : "";
    const payload = token ? verifyToken(token) : null;
    if (!payload) {
      set.status = 401;
      return "unauthorized";
    }
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.isActive) {
      set.status = 401;
      return "unauthorized";
    }

    set.headers["Content-Type"] = "text/event-stream";
    set.headers["Cache-Control"] = "no-cache, no-transform";
    set.headers["Connection"] = "keep-alive";

    const encoder = new TextEncoder();
    let unsubscribe: () => void = () => {};
    let keepAlive: ReturnType<typeof setInterval>;

    const stream = new ReadableStream({
      start(controller) {
        const send = (data: string) => {
          try { controller.enqueue(encoder.encode(data)); } catch { /* stream already closed */ }
        };
        send(": connected\n\n");
        unsubscribe = subscribe(user.id, send);
        // Keep the connection alive through proxies/load balancers that
        // drop idle connections (Railway's edge included).
        keepAlive = setInterval(() => send(": ping\n\n"), 25000);
      },
      cancel() {
        clearInterval(keepAlive);
        unsubscribe();
      },
    });

    request.signal?.addEventListener("abort", () => {
      clearInterval(keepAlive);
      unsubscribe();
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }
);
