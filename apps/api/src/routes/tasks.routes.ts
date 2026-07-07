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
  // For workflowMode=parallel, every pending assignment is visible immediately
  // (current/legacy behaviour). For sequential/hybrid, a task only surfaces
  // once every assignment at a lower stageOrder on that document is completed
  // \u2014 roles sharing a stageOrder run in parallel with each other, which is
  // what distinguishes hybrid from strict sequential.
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

    const gatedDocIds = assignments
      .filter((a) => a.document.workflowMode !== "parallel")
      .map((a) => a.documentId);

    let blockedDocIds = new Set<string>();
    if (gatedDocIds.length > 0) {
      const allAssignmentsForGatedDocs = await prisma.roleAssignment.findMany({
        where: { documentId: { in: gatedDocIds } },
        select: { documentId: true, stageOrder: true, status: true },
      });
      const byDoc = new Map<string, typeof allAssignmentsForGatedDocs>();
      for (const a of allAssignmentsForGatedDocs) {
        if (!byDoc.has(a.documentId)) byDoc.set(a.documentId, []);
        byDoc.get(a.documentId)!.push(a);
      }
      blockedDocIds = new Set(
        assignments
          .filter((a) => a.document.workflowMode !== "parallel")
          .filter((a) => {
            const siblings = byDoc.get(a.documentId) ?? [];
            return siblings.some((s) => s.stageOrder < a.stageOrder && s.status === "pending");
          })
          .map((a) => `${a.documentId}:${a.id}`)
      );
    }

    const visible = assignments.filter((a) => !blockedDocIds.has(`${a.documentId}:${a.id}`));

    return {
      tasks: visible.map((a) => ({
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
