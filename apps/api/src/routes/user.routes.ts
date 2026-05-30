import { Elysia } from "elysia";
import bcrypt from "bcryptjs";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";
import { parseBody, createUserSchema, updateUserSchema } from "../validators/schemas";
import { prisma } from "../lib/prisma";
import { Errors } from "../lib/errors";
import { createAuditLog } from "../services/audit.service";

export const userRoutes = new Elysia({ prefix: "/users" })
  .use(authMiddleware)

  // ── GET /users ────────────────────────────────────────────────────────────
  .get("/", async ({ user, set }) => {
    requirePermission(user, "user:read", set);
    return prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, department: true, isActive: true, createdAt: true },
      orderBy: { name: "asc" } });
  })

  // ── POST /users ───────────────────────────────────────────────────────────
  .post("/", async ({ user, body, set }) => {
    requirePermission(user, "user:create", set);
    const parsed = parseBody(createUserSchema, body);
    if (!parsed.ok) { set.status = 400; return Errors.badRequest("Invalid user data", parsed.errors); }

    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) { set.status = 409; return Errors.conflict("A user with that email already exists"); }

    const hashed = await bcrypt.hash(parsed.data.password, 10);
    const created = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: hashed,
        role: parsed.data.role,
        department: parsed.data.department },
      select: { id: true, name: true, email: true, role: true, department: true, isActive: true } });

    await createAuditLog(user.id, "user_created", "User", created.id, { email: created.email });

    set.status = 201;
    return created;
  })

  // ── PATCH /users/:id ──────────────────────────────────────────────────────
  .patch("/:id", async ({ user, params, body, set }) => {
    requirePermission(user, "user:update", set);
    const parsed = parseBody(updateUserSchema, body);
    if (!parsed.ok) { set.status = 400; return Errors.badRequest("Invalid update data", parsed.errors); }

    const target = await prisma.user.findUnique({ where: { id: params.id } });
    if (!target) { set.status = 404; return Errors.notFound("User"); }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
        ...(parsed.data.role !== undefined ? { role: parsed.data.role} : {}),
        ...(parsed.data.department !== undefined ? { department: parsed.data.department } : {}) },
      select: { id: true, name: true, email: true, role: true, department: true, isActive: true } });

    await createAuditLog(user.id, "user_updated", "User", params.id, { changes: JSON.stringify(parsed.data) });

    return updated;
  })

  // ── POST /users/:id/unlock ────────────────────────────────────────────────
  .post("/:id/unlock", async ({ user, params, set }) => {
    requirePermission(user, "user:update", set);

    const target = await prisma.user.findUnique({ where: { id: params.id } });
    if (!target) { set.status = 404; return Errors.notFound("User"); }

    if (target.failedLogins === 0 && !target.lockedUntil) {
      set.status = 400;
      return Errors.badRequest("Account is not locked");
    }

    await prisma.user.update({
      where: { id: params.id },
      data: { failedLogins: 0, lockedUntil: null } });

    await createAuditLog(user.id, "user_updated", "User", params.id, {
      action: "account_unlocked",
      targetEmail: target.email });

    return { success: true, message: `Account for ${target.email} has been unlocked` };
  });
