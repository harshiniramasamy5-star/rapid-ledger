import { Elysia, t } from "elysia";
import { authMiddleware } from "../middleware/auth";
import { loginUser, getCurrentUser } from "../services/auth.service";
import { Errors } from "../lib/errors";

export const authRoutes = new Elysia({ prefix: "/auth" })
  .post(
    "/login",
    async ({ body, set }: { body: { email: string; password: string }; set: { status: number } }) => {
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
  .get("/me", async ({ user, set }: { user: { id: string }; set: { status: number } }) => {
    const profile = await getCurrentUser(user.id);
    if (!profile) {
      set.status = 401;
      return Errors.unauthorized();
    }
    return profile;
  });
