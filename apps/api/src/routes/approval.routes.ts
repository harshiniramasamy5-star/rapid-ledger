import { Elysia } from "elysia";
import { authMiddleware } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { Errors } from "../lib/errors";

export const approvalRoutes = new Elysia({ prefix: "/approvals" })
  .use(authMiddleware)
  .get("/my", async ({ user, set }) => {
    if (!user) { set.status = 401; return Errors.unauthorized(); }
    return prisma.approval.findMany({
      where: { approverId: user.id },
      include: { document: true },
      orderBy: { createdAt: "desc" },
    });
  });
