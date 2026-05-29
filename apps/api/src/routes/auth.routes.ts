import { Elysia, t } from "elysia";
import { authMiddleware } from "../middleware/auth";
import { loginUser, getCurrentUser } from "../services/auth.service";
import { checkRateLimit } from "../lib/rate-limit";
import { Errors } from "../lib/errors";

export const authRoutes = new Elysia({ prefix: "/auth" })
  .post(
    "/login",
    async (ctx) => {
      const { email, password } = ctx.body as { email: string; password: string };

      // IP-based rate limiting
      const ip = ctx.request.headers.get("x-forwarded-for") ?? "unknown";
      const rateCheck = checkRateLimit(ip);
      if (!rateCheck.allowed) {
        ctx.set.status = 429;
        return Errors.custom("RATE_LIMITED", "Too many login attempts. Try again in 15 minutes.");
      }

      const result = await loginUser(email, password);

      if (!result.success) {
        if (result.reason === "account_locked") {
          ctx.set.status = 423;
          const mins = result.lockedUntil
            ? Math.ceil((result.lockedUntil.getTime() - Date.now()) / 60000)
            : 30;
          return Errors.custom("ACCOUNT_LOCKED", `Account locked due to too many failed attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`);
        }
        if (result.reason === "account_inactive") {
          ctx.set.status = 403;
          return Errors.custom("ACCOUNT_INACTIVE", "This account has been deactivated. Contact your administrator.");
        }
        ctx.set.status = 401;
        return Errors.unauthorized("Invalid email or password");
      }

      ctx.set.status = 200;
      return result.data;
    },
    {
      body: t.Object({
        email: t.String({ minLength: 1 }),
        password: t.String({ minLength: 1 }),
      }),
    }
  )
  .use(authMiddleware)
  .get("/me", async (ctx) => {
    const user = ctx.user as { id: string };
    const profile = await getCurrentUser(user.id);
    if (!profile) {
      ctx.set.status = 401;
      return Errors.unauthorized();
    }
    return profile;
  });
