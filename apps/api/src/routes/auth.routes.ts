import { Elysia, t } from "elysia";
import { authMiddleware } from "../middleware/auth";
import { loginUser, getCurrentUser } from "../services/auth.service";
import { Errors } from "../lib/errors";
import { rateLimiter } from "../lib/rate-limit";

export const authRoutes = new Elysia({ prefix: "/auth" })
  .use(rateLimiter)
  .post(
    "/login",
    async ({ body, set }) => {
      const result = await loginUser(body.email, body.password);
      if (!result) {
        set.status = 401;
        return Errors.unauthorized("Invalid email or password");
      }
      set.status = 200;
      return result;
    },
    {
      body: t.Object({
        email: t.String({ minLength: 1 }),
        password: t.String({ minLength: 1 }),
      }),
    }
  )
  .use(authMiddleware)
  .get("/me", async ({ user, set }) => {
    const profile = await getCurrentUser(user.id);
    if (!profile) {
      set.status = 401;
      return Errors.unauthorized();
    }
    return profile;
  });
