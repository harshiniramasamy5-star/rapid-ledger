import type { RapidDocument, RoleAssignment, Evidence } from "@prisma/client";
import type { ValidationResult, ValidationError } from "../types";

export interface ValidateDocumentInput {
  document: Pick<RapidDocument, "title" | "decisionSummary" | "riskLevel" | "complianceImpact" | "businessContext" | "problemStatement" | "proposedDecision">;
  roles: Pick<RoleAssignment, "roleType" | "userId">[];
  evidence: Evidence[];
}

export function validateDocument(input: ValidateDocumentInput): ValidationResult {
  const { document, roles, evidence } = input;
  const errors: ValidationError[] = [];

  if (!document.title?.trim()) errors.push({ rule: "title_required", message: "Title is required", field: "title" });
  if (!document.decisionSummary?.trim()) errors.push({ rule: "decision_summary_required", message: "Decision summary is required", field: "decisionSummary" });

  const assignedRoles = new Set(roles.map((r) => r.roleType));
  if (!assignedRoles.has("recommend")) errors.push({ rule: "recommend_required", message: "At least one Recommend (R) owner is required" });
  if (!assignedRoles.has("perform")) errors.push({ rule: "perform_required", message: "At least one Perform (P) owner is required" });
  if (!assignedRoles.has("decide")) errors.push({ rule: "decide_required", message: "A Decide (D) owner is required" });

  const deciders = roles.filter((r) => r.roleType === "decide");
  if (deciders.length > 1) errors.push({ rule: "single_decider", message: "Only one Decide (D) owner is allowed" });

  const recommenderIds = new Set(roles.filter((r) => r.roleType === "recommend").map((r) => r.userId));
  const deciderIds = new Set(roles.filter((r) => r.roleType === "decide").map((r) => r.userId));
  if ([...recommenderIds].some((id) => deciderIds.has(id))) errors.push({ rule: "recommend_decide_conflict", message: "The same person cannot be both Recommend (R) and Decide (D)" });

  const isHighRisk = document.riskLevel === "high" || document.riskLevel === "critical";
  if (isHighRisk && !assignedRoles.has("agree")) errors.push({ rule: "agree_required_high_risk", message: "High/critical risk documents require an Agree (A) owner" });
  if (isHighRisk && evidence.length === 0) errors.push({ rule: "evidence_required_high_risk", message: "High/critical risk documents require at least one piece of evidence" });
  if (document.complianceImpact && !document.businessContext?.trim()) errors.push({ rule: "business_context_required_compliance", message: "Business context is required when compliance impact is flagged", field: "businessContext" });

  return { valid: errors.length === 0, errors };
}
