import { Elysia } from "elysia";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../lib/auth";

export const commentsRoutes = new Elysia({ prefix: "/documents" })
  .get("/:id/comments", async ({ params, set, request }) => {
    const user = await requireAuth(request, set);
    if (!user) return;
    const comments = await prisma.comment.findMany({
      where: { documentId: params.id, parentId: null },
      include: {
        author: { select: { id: true, name: true, role: true } },
        replies: {
          include: { author: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return comments;
  })
  .post("/:id/comments", async ({ params, body, set, request }) => {
    const user = await requireAuth(request, set);
    if (!user) return;
    const { content } = body as { content: string };
    if (!content?.trim()) { set.status = 400; return { error: { code: "BAD_REQUEST", message: "Content required" } }; }
    const doc = await prisma.rapidDocument.findUnique({ where: { id: params.id } });
    if (!doc) { set.status = 404; return { error: { code: "NOT_FOUND", message: "Document not found" } }; }
    const comment = await prisma.comment.create({
      data: { content: content.trim(), documentId: params.id, authorId: user.id },
      include: { author: { select: { id: true, name: true, role: true } }, replies: true },
    });
    return comment;
  })
  .post("/:id/comments/:commentId/replies", async ({ params, body, set, request }) => {
    const user = await requireAuth(request, set);
    if (!user) return;
    const { content } = body as { content: string };
    if (!content?.trim()) { set.status = 400; return { error: { code: "BAD_REQUEST", message: "Content required" } }; }
    const parent = await prisma.comment.findUnique({ where: { id: params.commentId } });
    if (!parent) { set.status = 404; return { error: { code: "NOT_FOUND", message: "Comment not found" } }; }
    const reply = await prisma.comment.create({
      data: { content: content.trim(), documentId: params.id, authorId: user.id, parentId: params.commentId },
      include: { author: { select: { id: true, name: true, role: true } }, replies: true },
    });
    return reply;
  });
