import { Elysia } from "elysia";
import { authMiddleware } from "../middleware/auth";
import { prisma } from "../lib/prisma";

const ROLE_ACTION_LABELS: Record<string, string> = {
  recommend: "Recommend",
  agree: "Approve",
  perform: "Execute",
  input: "Provide Input",
  decide: "Decide",
  review: "Review",
  acknowledge: "Acknowledge",
  inform: "Acknowledge Notice",
};

export const tasksRoutes = new Elysia({ prefix: "/tasks" })
  .use(authMiddleware)

  // \u2500\u2500 GET /tasks/pending \u2500 every RoleAssignment owed by the current user \u2500\u2500\u2500\u2500
  .get("/pending", async ({ user }) => {
    const assignments = await prisma.roleAssignment.findMany({
      where: { userId: user.id, status: "pending" },
      include: {
        document: {
          select: {
            id: true,
            documentCode: true,
            title: true,
            status: true,
            deadline: true,
            riskLevel: true,
            workflowMode: true,
          },
        },
      },
      orderBy: [{ stageOrder: "asc" }, { createdAt: "asc" }],
    });

    return {
      tasks: assignments.map((a) => ({
        id: a.id,
        documentId: a.documentId,
        documentCode: a.document.documentCode,
        documentTitle: a.document.title,
        documentStatus: a.document.status,
        deadline: a.document.deadline,
        riskLevel: a.document.riskLevel,
        workflowMode: a.document.workflowMode,
        roleType: a.roleType,
        actionRequired: a.actionLabel ?? ROLE_ACTION_LABELS[a.roleType] ?? a.roleType,
        stageOrder: a.stageOrder,
      })),
    };
  });
