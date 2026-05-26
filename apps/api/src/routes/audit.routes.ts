/* eslint-disable @typescript-eslint/no-explicit-any */
import { Elysia } from "elysia";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";
import { getAuditLogs } from "../services/audit.service";

export const auditRoutes = new Elysia({ prefix: "/audit" })
  .use(authMiddleware)
  .get("/", async ({ user, query, set }: any) => {
    requirePermission(user, "audit:read", set);
    return getAuditLogs(query.actorId, query.objectType, query.objectId);
  });
