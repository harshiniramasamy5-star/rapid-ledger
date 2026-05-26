import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Must be a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const riskLevelSchema = z.enum(["low", "medium", "high", "critical"]);

export const createDocumentSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  decisionSummary: z.string().min(1, "Decision summary is required").max(2000),
  riskLevel: riskLevelSchema.default("low"),
  complianceImpact: z.boolean().default(false),
  department: z.string().optional(),
  deadline: z.string().datetime({ offset: true }).optional(),
  businessContext: z.string().optional(),
  problemStatement: z.string().optional(),
  proposedDecision: z.string().optional(),
  alternativesConsidered: z.string().optional(),
});

export const approvalSchema = z.object({
  comment: z.string().max(1000).optional(),
});

export const assignRoleSchema = z.object({
  roleType: z.enum(["recommend", "agree", "perform", "input", "decide"]),
  userId: z.string().min(1, "User ID is required"),
});

export const addEvidenceSchema = z.object({
  type: z.enum(["link", "file", "note"]),
  title: z.string().min(1, "Title is required"),
  urlOrPath: z.string().optional(),
  description: z.string().optional(),
});

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Must be a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "creator", "approver", "viewer", "recommender", "performer"]),
  department: z.string().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  role: z.enum(["admin", "creator", "approver", "viewer", "recommender", "performer"]).optional(),
  department: z.string().optional(),
});

export function parseBody<T>(
  schema: z.ZodType<T>,
  body: unknown
): { ok: true; data: T } | { ok: false; errors: string[] } {
  const result = schema.safeParse(body);
  if (!result.success) {
    return { ok: false, errors: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`) };
  }
  return { ok: true, data: result.data };
}
