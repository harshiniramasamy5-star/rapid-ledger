import { Elysia } from "elysia";
import { authMiddleware } from "../middleware/auth";
import { loginUser, getCurrentUser } from "../services/auth.service";
import { parseBody, loginSchema } from "../validators/schemas";
import { Errors } from "../lib/errors";
import { checkLoginRateLimit, resetLoginAttempts } from "../lib/rate-limit";

export const authRoutes = new Elysia({ prefix: "/auth" })
  .post("/login", async ({ body, set, request }) => {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const rate = checkLoginRateLimit(ip);
    if (!rate.allowed) { set.status = 429; return Errors.badRequest("Too many login attempts. Try again in 15 minutes."); }

    const parsed = parseBody(loginSchema, body);
    if (!parsed.ok) { set.status = 400; return Errors.badRequest("Invalid request body", parsed.errors); }

    const result = await loginUser(parsed.data.email, parsed.data.password);
    if (!result) { set.status = 401; return Errors.unauthorized("Invalid email or password"); }

    resetLoginAttempts(ip);
    return result; // { token, user }
  })
  .use(authMiddleware)
  .get("/me", async ({ user, set }) => {
    const profile = await getCurrentUser((user as { id: string }).id);
    if (!profile) { set.status = 401; return Errors.unauthorized(); }
    return profile;
  });
