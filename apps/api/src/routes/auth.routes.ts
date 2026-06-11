import { Elysia, t } from "elysia";
import { authMiddleware } from "../middleware/auth";
import { loginUser, getCurrentUser, registerUser, verifyEmail, resendVerificationEmail } from "../services/auth.service";
import { sendVerificationEmail, sendWelcomeEmail } from "../services/email.service";
import { checkRateLimit } from "../lib/rate-limit";
import { Errors } from "../lib/errors";

export const authRoutes = new Elysia({ prefix: "/auth" })
  .post(
    "/login",
    async (ctx) => {
      const { email, password } = ctx.body as { email: string; password: string };

      const ip = ctx.request.headers.get("x-forwarded-for") ?? "unknown";
      const rateCheck = checkRateLimit(ip);
      if (!rateCheck.allowed) {
        ctx.set.status = 429;
        return Errors.custom("RATE_LIMITED", "Too many login attempts. Try again in 15 minutes.");
      }

      const result = await loginUser(email, password);

      if (!result.success) {
        if (result.reason === "email_not_verified") {
          ctx.set.status = 403;
          return Errors.custom("EMAIL_NOT_VERIFIED", "Please verify your email before logging in. Check your inbox.");
        }
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
        if ((result.reason as string) === "totp_required") {
          // Signal to client that TOTP is required; do NOT send a token yet
          ctx.set.status = 200;
          return { requiresMfa: true, userId: (result as { userId?: string }).userId };
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
  .post(
    "/register",
    async (ctx) => {
      const { name, email, password } = ctx.body as { name: string; email: string; password: string };
      const result = await registerUser(name, email, password);
      if (!result.success) {
        ctx.set.status = 400;
        return { error: { code: "REGISTER_FAILED", message: result.message } };
      }
      sendVerificationEmail(email, name, result.token!).catch((e) => console.error("[Register] Failed to send verification email:", e));
      ctx.set.status = 201;
      return { message: "Account created. Check your email to verify your account." };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        email: t.String({ minLength: 1 }),
        password: t.String({ minLength: 8 }),
      }),
    }
  )
  .get("/verify-email", async (ctx) => {
    const token = (ctx.query as { token?: string }).token;
    if (!token) {
      ctx.set.status = 400;
      return { error: { code: "MISSING_TOKEN", message: "Verification token required" } };
    }
    const result = await verifyEmail(token);
    if (!result.success) {
      ctx.set.status = 400;
      const code = (result as { alreadyUsed?: boolean }).alreadyUsed ? "ALREADY_USED" : "INVALID_TOKEN";
      return { error: { code, message: result.message } };
    }
    try {
      await sendWelcomeEmail(result.email!, result.name!);
    } catch (e) {
      console.error("[Verify] Failed to send welcome email:", e);
    }
    return { message: "Email verified successfully. You can now log in." };
  })
  .post(
    "/resend-verification",
    async (ctx) => {
      const { email } = ctx.body as { email: string };
      const result = await resendVerificationEmail(email);
      // Always 200 to avoid email enumeration
      ctx.set.status = 200;
      return { message: result.message ?? "If this email is registered and unverified, a link has been sent." };
    },
    {
      body: t.Object({
        email: t.String({ minLength: 1 }),
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
