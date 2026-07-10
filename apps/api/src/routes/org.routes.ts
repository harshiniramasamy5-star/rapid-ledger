import { Elysia } from "elysia";
import { sendInviteEmail } from "../services/email.service";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";
import { createAuditLog } from "../services/audit.service";

export const orgRoutes = new Elysia({ prefix: "/orgs" })
  .use(authMiddleware)

  .post("/", async ({ user, body, set }) => {
    const { name, domain, logoUrl, description } = body as {
      name: string; domain?: string; logoUrl?: string; description?: string;
    };
    if (!name) { set.status = 400; return { error: "name required" }; }
    if (domain) {
      const existing = await prisma.organization.findUnique({ where: { domain } });
      if (existing) { set.status = 409; return { error: "domain already registered" }; }
    }
    let cleanLogoUrl: string | undefined;
    if (logoUrl) {
      const MAX_DATA_URI_LENGTH = 300_000;
      const isDataUri = logoUrl.startsWith("data:image/");
      if (isDataUri) {
        if (logoUrl.length > MAX_DATA_URI_LENGTH) {
          set.status = 400;
          return { error: "Logo image is too large." };
        }
        cleanLogoUrl = logoUrl;
      } else {
        try {
          const parsed = new URL(logoUrl);
          if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("bad protocol");
          if (logoUrl.length > 2048) throw new Error("too long");
          cleanLogoUrl = logoUrl;
        } catch {
          set.status = 400;
          return { error: "logoUrl must be a valid http(s) URL or an uploaded image" };
        }
      }
    }
    const org = await prisma.organization.create({
      data: { name, domain, logoUrl: cleanLogoUrl, description: description?.trim() || undefined },
    });
    await prisma.workspaceMember.create({
      data: { userId: user.id, orgId: org.id, accessType: "admin" },
    });
    if (!user.orgId) {
      await prisma.user.update({ where: { id: user.id }, data: { orgId: org.id, role: "admin" } });
    }
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "workspace_created",
        entityType: "Organization",
        entityId: org.id,
        orgId: org.id,
        details: JSON.stringify({ name, domain, hasLogo: !!cleanLogoUrl }),
      },
    });
    set.status = 201;
    return { org };
  })

  .get("/mine", async ({ user, set }) => {
    requirePermission(user, "user:read", set);
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: user.id },
      include: { org: { include: { _count: { select: { users: true } } } } },
      orderBy: { joinedAt: "asc" },
    });
    const workspaces = memberships.map(m => ({
      id: m.org.id,
      name: m.org.name,
      domain: m.org.domain,
      logoUrl: m.org.logoUrl,
      description: m.org.description,
      memberCount: m.org._count.users,
      accessType: m.accessType,
      isActive: m.orgId === user.orgId,
    }));
    return { workspaces };
  })

  .post("/:id/switch", async ({ user, params, set }) => {
    requirePermission(user, "user:read", set);
    const membership = await prisma.workspaceMember.findUnique({
      where: { userId_orgId: { userId: user.id, orgId: params.id } },
    });
    if (!membership) { set.status = 403; return { error: "not a member of this workspace" }; }
    await prisma.user.update({ where: { id: user.id }, data: { orgId: params.id } });
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "workspace_created" as any,
        entityType: "Organization",
        entityId: params.id,
        orgId: params.id,
        details: JSON.stringify({ event: "workspace_switched" }),
      },
    });
    return { message: "workspace switched", orgId: params.id, accessType: membership.accessType };
  })

  .get("/:id", async ({ user, params, set }) => {
    requirePermission(user, "user:read", set);
    const org = await prisma.organization.findUnique({
      where: { id: params.id },
      include: { _count: { select: { users: true, invites: true } } },
    });
    if (!org) { set.status = 404; return { error: "org not found" }; }
    return { org };
  })

  .patch("/:id", async ({ user, params, body, set }) => {
    requirePermission(user, "user:create", set);
    if (user.orgId !== params.id) { set.status = 403; return { error: "not your workspace" }; }
    const { name, domain, logoUrl, description } = body as {
      name?: string; domain?: string; logoUrl?: string; description?: string;
    };
    const org = await prisma.organization.findUnique({ where: { id: params.id } });
    if (!org) { set.status = 404; return { error: "org not found" }; }
    if (domain && domain !== org.domain) {
      const existing = await prisma.organization.findUnique({ where: { domain } });
      if (existing) { set.status = 409; return { error: "domain already registered" }; }
    }
    if (logoUrl) {
      const MAX_DATA_URI_LENGTH = 300_000;
      const isDataUri = logoUrl.startsWith("data:image/");
      if (isDataUri) {
        if (logoUrl.length > MAX_DATA_URI_LENGTH) {
          set.status = 400;
          return { error: "Logo image is too large." };
        }
      } else {
        try {
          const parsed = new URL(logoUrl);
          if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("bad protocol");
        } catch {
          set.status = 400;
          return { error: "logoUrl must be a valid http(s) URL or an uploaded image" };
        }
      }
    }
    const updated = await prisma.organization.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(domain !== undefined ? { domain: domain.trim() || null } : {}),
        ...(logoUrl !== undefined ? { logoUrl: logoUrl.trim() || null } : {}),
        ...(description !== undefined ? { description: description.trim() || null } : {}),
      },
    });
    await createAuditLog(user.id, "user_updated", "Organization", params.id, { event: "branding_updated", changes: { name, domain, hasLogo: !!logoUrl, description } });
    return { org: updated };
  })

  .get("/:id/members", async ({ user, params, set }) => {
    requirePermission(user, "user:read", set);
    const members = await prisma.workspaceMember.findMany({
      where: { orgId: params.id },
      include: { user: { select: { id: true, name: true, email: true, role: true, createdAt: true } } },
    });
    return { members: members.map(m => ({ ...m.user, accessType: m.accessType })) };
  })

  .post("/:id/invite", async ({ user, params, body, set }) => {
    requirePermission(user, "user:create", set);
    if (!user.totpEnabled) {
      set.status = 403;
      return { error: "two-factor authentication must be enabled before inviting members" };
    }
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
    void sendInviteEmail(email, org.name, role || "viewer", invite.token).catch(e =>
      console.error("[Invite] Email failed:", e));
    return { invite: { id: invite.id, token: invite.token, email, expiresAt } };
  })

  .get("/my", async ({ user, set }) => {
    requirePermission(user, "user:read", set);
    if (!user.orgId) return { org: null };
    const org = await prisma.organization.findUnique({
      where: { id: user.orgId },
      include: { _count: { select: { users: true } } },
    });
    return { org };
  })

  .post("/join/:token", async ({ user, params, set }) => {
    const invite = await prisma.invite.findUnique({ where: { token: params.token } });
    if (!invite) { set.status = 404; return { error: "invalid invite token" }; }
    if (invite.usedAt) { set.status = 410; return { error: "invite already used" }; }
    if (invite.expiresAt < new Date()) { set.status = 410; return { error: "invite expired" }; }
    if (invite.email !== user.email) { set.status = 403; return { error: "invite is for a different email" }; }
    const accessType = invite.role === "admin" ? "admin" : "member";
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { orgId: invite.orgId, role: invite.role },
      }),
      prisma.workspaceMember.upsert({
        where: { userId_orgId: { userId: user.id, orgId: invite.orgId } },
        create: { userId: user.id, orgId: invite.orgId, accessType },
        update: { accessType },
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
  })

  .get("/invites/me", async ({ user }) => {
    const invites = await prisma.invite.findMany({
      where: { email: user.email, usedAt: null, expiresAt: { gt: new Date() } },
      include: { org: { select: { name: true, domain: true, logoUrl: true } } },
      orderBy: { createdAt: "desc" },
    });
    return {
      invites: invites.map(i => ({
        id: i.id,
        orgId: i.orgId,
        orgName: i.org.name,
        orgDomain: i.org.domain,
        orgLogoUrl: i.org.logoUrl,
        role: i.role,
        token: i.token,
        expiresAt: i.expiresAt,
        createdAt: i.createdAt,
      })),
    };
  })

  .post("/invites/:inviteId/decline", async ({ user, params, set }) => {
    const invite = await prisma.invite.findUnique({ where: { id: params.inviteId } });
    if (!invite) { set.status = 404; return { error: "invite not found" }; }
    if (invite.email !== user.email) { set.status = 403; return { error: "not your invite" }; }
    if (invite.usedAt) { set.status = 410; return { error: "invite already used" }; }
    await prisma.invite.delete({ where: { id: params.inviteId } });
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "invite_sent" as any,
        entityType: "Invite",
        entityId: params.inviteId,
        orgId: invite.orgId,
        details: JSON.stringify({ action: "declined", email: user.email }),
      },
    });
    return { message: "invite declined" };
  })

  .get("/:id/invites", async ({ user, params, set }) => {
    requirePermission(user, "user:read", set);
    const invites = await prisma.invite.findMany({
      where: { orgId: params.id, usedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return { invites };
  })

  .delete("/:id/invites/:inviteId", async ({ user, params, set }) => {
    requirePermission(user, "user:create", set);
    const invite = await prisma.invite.findUnique({ where: { id: params.inviteId } });
    if (!invite) { set.status = 404; return { error: "invite not found" }; }
    if (invite.orgId !== params.id) { set.status = 403; return { error: "not your org" }; }
    await prisma.invite.delete({ where: { id: params.inviteId } });
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "invite_sent" as any,
        entityType: "Invite",
        entityId: params.inviteId,
        orgId: params.id,
        details: JSON.stringify({ action: "revoked", email: invite.email }),
      },
    });
    return { message: "invite revoked" };
  })

  .post("/:id/invites/:inviteId/resend", async ({ user, params, set }) => {
    requirePermission(user, "user:create", set);
    const invite = await prisma.invite.findUnique({ where: { id: params.inviteId } });
    if (!invite) { set.status = 404; return { error: "invite not found" }; }
    if (invite.orgId !== params.id) { set.status = 403; return { error: "not your org" }; }
    if (invite.usedAt) { set.status = 410; return { error: "invite already used" }; }
    const org = await prisma.organization.findUnique({ where: { id: params.id } });
    if (!org) { set.status = 404; return { error: "org not found" }; }
    const { sendInviteEmail } = await import("../services/email.service");
    void sendInviteEmail(invite.email, org.name, invite.role, invite.token).catch(console.error);
    return { message: "invite resent" };
  })

  .patch("/:id/members/:userId", async ({ user, params, body, set }) => {
    requirePermission(user, "user:create", set);
    const { role } = body as { role: string };
    const validRoles = ["admin","creator","approver","recommender","performer","viewer"];
    if (!validRoles.includes(role)) { set.status = 400; return { error: "invalid role" }; }
    const target = await prisma.user.findUnique({ where: { id: params.userId } });
    if (!target) { set.status = 404; return { error: "user not found" }; }
    if (target.orgId !== params.id) { set.status = 403; return { error: "user not in this org" }; }
    const accessType = role === "admin" ? "admin" : "member";
    const [updated] = await prisma.$transaction([
      prisma.user.update({
        where: { id: params.userId },
        data: { role: role as "admin"|"creator"|"approver"|"recommender"|"performer"|"viewer" },
        select: { id: true, name: true, email: true, role: true },
      }),
      prisma.workspaceMember.upsert({
        where: { userId_orgId: { userId: params.userId, orgId: params.id } },
        create: { userId: params.userId, orgId: params.id, accessType },
        update: { accessType },
      }),
    ]);
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: role === "admin" ? "workspace_member_promoted" : "workspace_member_demoted",
        entityType: "User",
        entityId: params.userId,
        orgId: params.id,
        details: JSON.stringify({ newRole: role, changedBy: user.email }),
      },
    });
    return { user: updated };
  })

  .delete("/:id/members/:userId", async ({ user, params, set }) => {
    requirePermission(user, "user:create", set);
    const target = await prisma.user.findUnique({ where: { id: params.userId } });
    if (!target) { set.status = 404; return { error: "user not found" }; }
    if (target.orgId !== params.id) { set.status = 403; return { error: "user not in this org" }; }
    await prisma.$transaction([
      prisma.user.update({
        where: { id: params.userId },
        data: { orgId: null, role: "viewer" },
      }),
      prisma.workspaceMember.deleteMany({
        where: { userId: params.userId, orgId: params.id },
      }),
    ]);
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "workspace_member_removed",
        entityType: "User",
        entityId: params.userId,
        orgId: params.id,
        details: JSON.stringify({ removedEmail: target.email }),
      },
    });
    return { message: "member removed" };
  });
