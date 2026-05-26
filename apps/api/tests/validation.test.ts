import { describe, it, expect } from "vitest";
import { validateDocument } from "../src/services/validation.service";
import type { Evidence, RapidDocument, RoleAssignment } from "@prisma/client";

function makeDoc(
  overrides: Partial<
    Pick<
      RapidDocument,
      "title" | "decisionSummary" | "riskLevel" | "complianceImpact" | "businessContext" | "problemStatement" | "proposedDecision"
    >
  > = {}
) {
  return {
    title: "Migrate to S3",
    decisionSummary: "Move all file storage from local disk to AWS S3",
    riskLevel: "low" as const,
    complianceImpact: false,
    businessContext: null,
    problemStatement: null,
    proposedDecision: null,
    ...overrides,
  };
}

function makeRole(roleType: RoleAssignment["roleType"], userId = "user-1") {
  return { id: "role-1", documentId: "doc-1", roleType, userId, createdAt: new Date() } as RoleAssignment;
}

function makeEvidence(overrides: Partial<Evidence> = {}): Evidence {
  return {
    id: "ev-1",
    documentId: "doc-1",
    type: "link",
    title: "Policy",
    urlOrPath: "https://example.com",
    description: null,
    uploadedBy: "user-1",
    createdAt: new Date(),
    ...overrides,
  } as Evidence;
}

const BASE_ROLES = [
  makeRole("recommend"),
  makeRole("perform", "user-2"),
  makeRole("decide", "user-3"),
];

describe("validateDocument", () => {
  it("passes for a fully valid low-risk document", () => {
    const result = validateDocument({ document: makeDoc(), roles: BASE_ROLES, evidence: [] });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("fails when title is missing", () => {
    const result = validateDocument({ document: makeDoc({ title: "" }), roles: BASE_ROLES, evidence: [] });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: { rule: string }) => e.rule === "title_required")).toBe(true);
  });

  it("fails when decisionSummary is missing", () => {
    const result = validateDocument({ document: makeDoc({ decisionSummary: "" }), roles: BASE_ROLES, evidence: [] });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: { rule: string }) => e.rule === "decision_summary_required")).toBe(true);
  });

  it("fails when there is no Decide owner", () => {
    const roles = [makeRole("recommend"), makeRole("perform", "user-2")];
    const result = validateDocument({ document: makeDoc(), roles, evidence: [] });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: { rule: string }) => e.rule === "decide_required")).toBe(true);
  });

  it("fails when there is no Recommend owner", () => {
    const roles = [makeRole("perform", "user-2"), makeRole("decide", "user-3")];
    const result = validateDocument({ document: makeDoc(), roles, evidence: [] });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: { rule: string }) => e.rule === "recommend_required")).toBe(true);
  });

  it("fails when there is no Perform owner", () => {
    const roles = [makeRole("recommend"), makeRole("decide", "user-3")];
    const result = validateDocument({ document: makeDoc(), roles, evidence: [] });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: { rule: string }) => e.rule === "perform_required")).toBe(true);
  });

  it("fails when there are multiple Decide owners", () => {
    const roles = [
      makeRole("recommend"),
      makeRole("perform", "user-2"),
      makeRole("decide", "user-3"),
      makeRole("decide", "user-4"),
    ];
    const result = validateDocument({ document: makeDoc(), roles, evidence: [] });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: { rule: string }) => e.rule === "single_decider")).toBe(true);
  });

  it("fails when the same user is both Recommend and Decide", () => {
    const roles = [
      makeRole("recommend", "user-X"),
      makeRole("perform", "user-2"),
      makeRole("decide", "user-X"),
    ];
    const result = validateDocument({ document: makeDoc(), roles, evidence: [] });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: { rule: string }) => e.rule === "recommend_decide_conflict")).toBe(true);
  });

  it("fails for high-risk doc without an Agree owner", () => {
    const result = validateDocument({
      document: makeDoc({ riskLevel: "high" }),
      roles: BASE_ROLES,
      evidence: [makeEvidence()],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: { rule: string }) => e.rule === "agree_required_high_risk")).toBe(true);
  });

  it("fails for high-risk doc without evidence", () => {
    const roles = [...BASE_ROLES, makeRole("agree", "user-4")];
    const result = validateDocument({ document: makeDoc({ riskLevel: "high" }), roles, evidence: [] });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: { rule: string }) => e.rule === "evidence_required_high_risk")).toBe(true);
  });

  it("passes for high-risk doc with Agree owner and evidence", () => {
    const roles = [...BASE_ROLES, makeRole("agree", "user-4")];
    const result = validateDocument({
      document: makeDoc({ riskLevel: "high" }),
      roles,
      evidence: [makeEvidence()],
    });
    expect(result.valid).toBe(true);
  });

  it("passes for critical-risk doc with Agree owner and evidence", () => {
    const roles = [...BASE_ROLES, makeRole("agree", "user-4")];
    const result = validateDocument({
      document: makeDoc({ riskLevel: "critical" }),
      roles,
      evidence: [makeEvidence()],
    });
    expect(result.valid).toBe(true);
  });

  it("fails for compliance doc without businessContext", () => {
    const result = validateDocument({
      document: makeDoc({ complianceImpact: true, businessContext: null }),
      roles: BASE_ROLES,
      evidence: [],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: { rule: string }) => e.rule === "business_context_required_compliance")).toBe(true);
  });

  it("passes for compliance doc with businessContext", () => {
    const result = validateDocument({
      document: makeDoc({ complianceImpact: true, businessContext: "Regulatory requirement" }),
      roles: BASE_ROLES,
      evidence: [],
    });
    expect(result.valid).toBe(true);
  });

  it("returns multiple errors simultaneously", () => {
    const result = validateDocument({ document: makeDoc({ title: "", decisionSummary: "" }), roles: [], evidence: [] });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});
