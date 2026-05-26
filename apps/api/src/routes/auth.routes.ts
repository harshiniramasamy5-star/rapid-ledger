/* eslint-disable @typescript-eslint/no-explicit-any */
import { Elysia } from "elysia";
import { authMiddleware } from "../middleware/auth";
import { loginUser, getCurrentUser } from "../services/auth.service";
import { parseBody, loginSchema } from "../validators/schemas";
import { Errors } from "../lib/errors";

export const authRoutes = new Elysia({ prefix: "/auth" })
  .post("/login", async ({ body, set }: any) => {
    const parsed = parseBody(loginSchema, body);
    if (!parsed.ok) { set.status = 400; return Errors.badRequest("Invalid request body", parsed.errors); }
    const result = await loginUser(parsed.data.email, parsed.data.password);
    if (!result) { set.status = 401; return Errors.unauthorized("Invalid email or password"); }
    return result; // { token, user } — Fix 4: lowercase user
  })
  .use(authMiddleware)
  .get("/me", async ({ user, set }: any) => {
    const profile = await getCurrentUser(user.id);
    if (!profile) { set.status = 401; return Errors.unauthorized(); }
    return profile;
  });
