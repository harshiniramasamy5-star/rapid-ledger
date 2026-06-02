import { Elysia } from "elysia";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { Errors } from "../lib/errors";

export const commentsRoutes = new Elysia({ prefix: "/documents" })
  .use(authMiddleware)
  .get("/:id/comments", async ({ params, user, set }) => {
    if (!user) { set.status = 401; return Errors.unauthorized(); }
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
  .post("/:id/comments", async ({ params, body, user, set }) => {
    if (!user) { set.status = 401; return Errors.unauthorized(); }
    const { content } = body as { content: string };
    if (!content?.trim()) { set.status = 400; return Errors.badRequest("Content required"); }
    const doc = await prisma.rapidDocument.findUnique({ where: { id: params.id } });
    if (!doc) { set.status = 404; return Errors.notFound("Document"); }
    return prisma.comment.create({
      data: { content: content.trim(), documentId: params.id, authorId: user.id },
      include: { author: { select: { id: true, name: true, role: true } }, replies: true },
    });
  })
  .post("/:id/comments/:commentId/replies", async ({ params, body, user, set }) => {
    if (!user) { set.status = 401; return Errors.unauthorized(); }
    const { content } = body as { content: string };
    if (!content?.trim()) { set.status = 400; return Errors.badRequest("Content required"); }
    const parent = await prisma.comment.findUnique({ where: { id: params.commentId } });
    if (!parent) { set.status = 404; return Errors.notFound("Comment"); }
    return prisma.comment.create({
      data: { content: content.trim(), documentId: params.id, authorId: user.id, parentId: params.commentId },
      include: { author: { select: { id: true, name: true, role: true } }, replies: true },
    });
  });
