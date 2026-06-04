import { Elysia } from "elysia";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";

export const orgRoutes = new Elysia({ prefix: "/orgs" })
  .use(authMiddleware)

  // POST /orgs — create org (admin only)
  .post("/", async ({ user, body, set }) => {
    requirePermission(user, "user:create", set);
    const { name, domain } = body as { name: string; domain?: string };
    if (!name) { set.status = 400; return { error: "name required" }; }
    if (domain) {
      const existing = await prisma.organization.findUnique({ where: { domain } });
      if (existing) { set.status = 409; return { error: "domain already registered" }; }
    }
    const org = await prisma.organization.create({ data: { name, domain } });
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "org_created",
        entityType: "Organization",
        entityId: org.id,
        orgId: org.id,
        details: JSON.stringify({ name, domain }),
      },
    });
    set.status = 201;
    return { org };
  })

  // GET /orgs/:id — get org info
  .get("/:id", async ({ user, params, set }) => {
    requirePermission(user, "user:read", set);
    const org = await prisma.organization.findUnique({
      where: { id: params.id },
      include: { _count: { select: { users: true, invites: true } } },
    });
    if (!org) { set.status = 404; return { error: "org not found" }; }
    return { org };
  })

  // GET /orgs/:id/members — list members
  .get("/:id/members", async ({ user, params, set }) => {
    requirePermission(user, "user:read", set);
    const members = await prisma.user.findMany({
      where: { orgId: params.id },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    return { members };
  })

  // POST /orgs/:id/invite — send invite (admin only)
  .post("/:id/invite", async ({ user, params, body, set }) => {
    requirePermission(user, "user:create", set);
    const { email, role } = body as { email: string; role?: string };
    if (!email) { set.status = 400; return { error: "email required" }; }
    const org = await prisma.organization.findUnique({ where: { id: params.id } });
    if (!org) { set.status = 404; return { error: "org not found" }; }
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invite = await prisma.invite.create({
      data: { email, orgId: params.id, role: (role as "admin" | "creator" | "approver" | "recommender" | "performer" | "viewer") || "viewer", expiresAt },
    });
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "invite_sent",
        entityType: "Invite",
        entityId: invite.id,
        orgId: params.id,
        details: JSON.stringify({ email, role: role || "viewer", expiresAt }),
      },
    });
    return { invite: { id: invite.id, token: invite.token, email, expiresAt } };
  })

  // POST /orgs/join/:token — accept invite
  .post("/join/:token", async ({ user, params, set }) => {
    const invite = await prisma.invite.findUnique({ where: { token: params.token } });
    if (!invite) { set.status = 404; return { error: "invalid invite token" }; }
    if (invite.usedAt) { set.status = 410; return { error: "invite already used" }; }
    if (invite.expiresAt < new Date()) { set.status = 410; return { error: "invite expired" }; }
    if (invite.email !== user.email) { set.status = 403; return { error: "invite is for a different email" }; }
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { orgId: invite.orgId, role: invite.role },
      }),
      prisma.invite.update({
        where: { id: invite.id },
        data: { usedAt: new Date() },
      }),
    ]);
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "invite_accepted",
        entityType: "Invite",
        entityId: invite.id,
        orgId: invite.orgId,
        details: JSON.stringify({ email: user.email }),
      },
    });
    return { message: "joined org successfully", orgId: invite.orgId };
  });
