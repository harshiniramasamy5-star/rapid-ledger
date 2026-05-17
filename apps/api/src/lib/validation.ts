/**
 * RAPID Document Validation Rules
 * 
 * These rules enforce the core RAPID governance requirements from the PRD.
 */

export interface ValidationError {
  field: string;
  rule: string;
  message: string;
  severity: "error" | "warning";
}

export interface RapidDocument {
  title?: string;
  decisionSummary?: string;
  riskLevel?: string;
  complianceImpact?: boolean;
  deadline?: string;
  status?: string;
}

export interface RapidRole {
  roleType: string;
  userId: string;
}

export interface Evidence {
  id: string;
  title: string;
  type: string;
}

/**
 * Validates a RAPID document before submission
 * Returns array of validation errors (empty if valid)
 */
export function validateDocument(
  doc: RapidDocument,
  roles: RapidRole[],
  evidence: Evidence[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Rule 1: Title required
  if (!doc.title || doc.title.trim() === "") {
    errors.push({
      field: "title",
      rule: "required",
      message: "Title is required",
      severity: "error"
    });
  }

  // Rule 2: Decision summary required
  if (!doc.decisionSummary || doc.decisionSummary.trim() === "") {
    errors.push({
      field: "decisionSummary",
      rule: "required",
      message: "Decision summary is required",
      severity: "error"
    });
  }

  // Rule 3: Deadline must not be in the past
  if (doc.deadline) {
    const deadlineDate = new Date(doc.deadline);
    const now = new Date();
    if (deadlineDate < now) {
      errors.push({
        field: "deadline",
        rule: "future_date",
        message: "Deadline cannot be in the past",
        severity: "error"
      });
    }
  }

  // Rule 4: Exactly one Decide owner required
  const decideRoles = roles.filter(r => r.roleType === "decide");
  if (decideRoles.length === 0) {
    errors.push({
      field: "roles.decide",
      rule: "exactly_one_decide_required",
      message: "Exactly one Decide owner is required",
      severity: "error"
    });
  } else if (decideRoles.length > 1) {
    errors.push({
      field: "roles.decide",
      rule: "exactly_one_decide_required",
      message: "Only one Decide owner is allowed",
      severity: "error"
    });
  }

  // Rule 5: At least one Recommend owner required
  const recommendRoles = roles.filter(r => r.roleType === "recommend");
  if (recommendRoles.length === 0) {
    errors.push({
      field: "roles.recommend",
      rule: "recommend_required",
      message: "At least one Recommend owner is required",
      severity: "error"
    });
  }

  // Rule 6: At least one Perform owner required
  const performRoles = roles.filter(r => r.roleType === "perform");
  if (performRoles.length === 0) {
    errors.push({
      field: "roles.perform",
      rule: "perform_required",
      message: "At least one Perform owner is required",
      severity: "error"
    });
  }

  // Rule 7: High-risk and critical decisions require Agree approver
  if (doc.riskLevel === "high" || doc.riskLevel === "critical") {
    const agreeRoles = roles.filter(r => r.roleType === "agree");
    if (agreeRoles.length === 0) {
      errors.push({
        field: "roles.agree",
        rule: "agree_required_for_high_risk",
        message: "High-risk and critical decisions require at least one Agree approver",
        severity: "error"
      });
    }
  }

  // Rule 8: Compliance-impacting decisions require evidence
  if (doc.complianceImpact === true) {
    if (evidence.length === 0) {
      errors.push({
        field: "evidence",
        rule: "evidence_required_for_compliance",
        message: "Compliance-impacting decisions require at least one evidence item",
        severity: "error"
      });
    }
  }

  // Rule 9: Rejected documents cannot be finalized
  if (doc.status === "rejected") {
    errors.push({
      field: "status",
      rule: "rejected_cannot_finalize",
      message: "Rejected documents cannot be finalized",
      severity: "error"
    });
  }

  return errors;
}

/**
 * Check if a document is valid (no errors)
 */
export function isDocumentValid(
  doc: RapidDocument,
  roles: RapidRole[],
  evidence: Evidence[]
): boolean {
  const errors = validateDocument(doc, roles, evidence);
  return errors.length === 0;
}
