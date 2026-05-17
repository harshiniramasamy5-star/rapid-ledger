import { describe, it, expect } from "vitest";
import { validateDocument, isDocumentValid } from "../src/lib/validation";

describe("RAPID Validation Engine", () => {
  
  describe("Rule: Title required", () => {
    it("should reject document without title", () => {
      const doc = { decisionSummary: "Summary" };
      const roles = [
        { roleType: "recommend", userId: "user1" },
        { roleType: "decide", userId: "user2" },
        { roleType: "perform", userId: "user3" }
      ];
      const errors = validateDocument(doc, roles, []);
      
      expect(errors.some(e => e.field === "title")).toBe(true);
      expect(errors.some(e => e.rule === "required")).toBe(true);
    });

    it("should accept document with valid title", () => {
      const doc = { 
        title: "Valid title",
        decisionSummary: "Summary"
      };
      const roles = [
        { roleType: "recommend", userId: "user1" },
        { roleType: "decide", userId: "user2" },
        { roleType: "perform", userId: "user3" }
      ];
      const errors = validateDocument(doc, roles, []);
      
      expect(errors.some(e => e.field === "title")).toBe(false);
    });
  });

  describe("Rule: Exactly one Decide owner", () => {
    it("should reject document with zero Decide owners", () => {
      const doc = { title: "Test", decisionSummary: "Summary" };
      const roles = [
        { roleType: "recommend", userId: "user1" },
        { roleType: "perform", userId: "user2" }
      ];
      const errors = validateDocument(doc, roles, []);
      
      expect(errors.some(e => e.rule === "exactly_one_decide_required")).toBe(true);
      expect(errors.find(e => e.rule === "exactly_one_decide_required")?.message)
        .toContain("Exactly one Decide owner is required");
    });

    it("should reject document with multiple Decide owners", () => {
      const doc = { title: "Test", decisionSummary: "Summary" };
      const roles = [
        { roleType: "recommend", userId: "user1" },
        { roleType: "decide", userId: "user2" },
        { roleType: "decide", userId: "user3" },
        { roleType: "perform", userId: "user4" }
      ];
      const errors = validateDocument(doc, roles, []);
      
      expect(errors.some(e => e.rule === "exactly_one_decide_required")).toBe(true);
      expect(errors.find(e => e.rule === "exactly_one_decide_required")?.message)
        .toContain("Only one Decide owner is allowed");
    });

    it("should accept document with exactly one Decide owner", () => {
      const doc = { title: "Test", decisionSummary: "Summary" };
      const roles = [
        { roleType: "recommend", userId: "user1" },
        { roleType: "decide", userId: "user2" },
        { roleType: "perform", userId: "user3" }
      ];
      const errors = validateDocument(doc, roles, []);
      
      expect(errors.some(e => e.rule === "exactly_one_decide_required")).toBe(false);
    });
  });

  describe("Rule: Recommend owner required", () => {
    it("should reject document without Recommend owner", () => {
      const doc = { title: "Test", decisionSummary: "Summary" };
      const roles = [
        { roleType: "decide", userId: "user1" },
        { roleType: "perform", userId: "user2" }
      ];
      const errors = validateDocument(doc, roles, []);
      
      expect(errors.some(e => e.rule === "recommend_required")).toBe(true);
    });

    it("should accept document with Recommend owner", () => {
      const doc = { title: "Test", decisionSummary: "Summary" };
      const roles = [
        { roleType: "recommend", userId: "user1" },
        { roleType: "decide", userId: "user2" },
        { roleType: "perform", userId: "user3" }
      ];
      const errors = validateDocument(doc, roles, []);
      
      expect(errors.some(e => e.rule === "recommend_required")).toBe(false);
    });
  });

  describe("Rule: Perform owner required", () => {
    it("should reject document without Perform owner", () => {
      const doc = { title: "Test", decisionSummary: "Summary" };
      const roles = [
        { roleType: "recommend", userId: "user1" },
        { roleType: "decide", userId: "user2" }
      ];
      const errors = validateDocument(doc, roles, []);
      
      expect(errors.some(e => e.rule === "perform_required")).toBe(true);
    });
  });

  describe("Rule: High-risk decisions require Agree approver", () => {
    it("should reject high-risk document without Agree approver", () => {
      const doc = { 
        title: "Test", 
        decisionSummary: "Summary",
        riskLevel: "high"
      };
      const roles = [
        { roleType: "recommend", userId: "user1" },
        { roleType: "decide", userId: "user2" },
        { roleType: "perform", userId: "user3" }
      ];
      const errors = validateDocument(doc, roles, []);
      
      expect(errors.some(e => e.rule === "agree_required_for_high_risk")).toBe(true);
    });

    it("should reject critical-risk document without Agree approver", () => {
      const doc = { 
        title: "Test", 
        decisionSummary: "Summary",
        riskLevel: "critical"
      };
      const roles = [
        { roleType: "recommend", userId: "user1" },
        { roleType: "decide", userId: "user2" },
        { roleType: "perform", userId: "user3" }
      ];
      const errors = validateDocument(doc, roles, []);
      
      expect(errors.some(e => e.rule === "agree_required_for_high_risk")).toBe(true);
    });

    it("should accept high-risk document with Agree approver", () => {
      const doc = { 
        title: "Test", 
        decisionSummary: "Summary",
        riskLevel: "high"
      };
      const roles = [
        { roleType: "recommend", userId: "user1" },
        { roleType: "agree", userId: "user2" },
        { roleType: "decide", userId: "user3" },
        { roleType: "perform", userId: "user4" }
      ];
      const errors = validateDocument(doc, roles, []);
      
      expect(errors.some(e => e.rule === "agree_required_for_high_risk")).toBe(false);
    });

    it("should accept low-risk document without Agree approver", () => {
      const doc = { 
        title: "Test", 
        decisionSummary: "Summary",
        riskLevel: "low"
      };
      const roles = [
        { roleType: "recommend", userId: "user1" },
        { roleType: "decide", userId: "user2" },
        { roleType: "perform", userId: "user3" }
      ];
      const errors = validateDocument(doc, roles, []);
      
      expect(errors.some(e => e.rule === "agree_required_for_high_risk")).toBe(false);
    });
  });

  describe("Rule: Compliance-impacting decisions require evidence", () => {
    it("should reject compliance document without evidence", () => {
      const doc = { 
        title: "Test", 
        decisionSummary: "Summary",
        complianceImpact: true
      };
      const roles = [
        { roleType: "recommend", userId: "user1" },
        { roleType: "decide", userId: "user2" },
        { roleType: "perform", userId: "user3" }
      ];
      const errors = validateDocument(doc, roles, []);
      
      expect(errors.some(e => e.rule === "evidence_required_for_compliance")).toBe(true);
    });

    it("should accept compliance document with evidence", () => {
      const doc = { 
        title: "Test", 
        decisionSummary: "Summary",
        complianceImpact: true
      };
      const roles = [
        { roleType: "recommend", userId: "user1" },
        { roleType: "decide", userId: "user2" },
        { roleType: "perform", userId: "user3" }
      ];
      const evidence = [
        { id: "ev1", title: "Policy doc", type: "link" }
      ];
      const errors = validateDocument(doc, roles, evidence);
      
      expect(errors.some(e => e.rule === "evidence_required_for_compliance")).toBe(false);
    });

    it("should accept non-compliance document without evidence", () => {
      const doc = { 
        title: "Test", 
        decisionSummary: "Summary",
        complianceImpact: false
      };
      const roles = [
        { roleType: "recommend", userId: "user1" },
        { roleType: "decide", userId: "user2" },
        { roleType: "perform", userId: "user3" }
      ];
      const errors = validateDocument(doc, roles, []);
      
      expect(errors.some(e => e.rule === "evidence_required_for_compliance")).toBe(false);
    });
  });

  describe("Rule: Rejected documents cannot be finalized", () => {
    it("should reject finalization of rejected document", () => {
      const doc = { 
        title: "Test", 
        decisionSummary: "Summary",
        status: "rejected"
      };
      const roles = [
        { roleType: "recommend", userId: "user1" },
        { roleType: "decide", userId: "user2" },
        { roleType: "perform", userId: "user3" }
      ];
      const errors = validateDocument(doc, roles, []);
      
      expect(errors.some(e => e.rule === "rejected_cannot_finalize")).toBe(true);
    });
  });

  describe("isDocumentValid helper", () => {
    it("should return true for fully valid document", () => {
      const doc = { 
        title: "Test Decision",
        decisionSummary: "We will do this thing",
        riskLevel: "low"
      };
      const roles = [
        { roleType: "recommend", userId: "user1" },
        { roleType: "decide", userId: "user2" },
        { roleType: "perform", userId: "user3" }
      ];
      
      expect(isDocumentValid(doc, roles, [])).toBe(true);
    });

    it("should return false for invalid document", () => {
      const doc = { title: "Test" }; // missing decisionSummary
      const roles = [
        { roleType: "recommend", userId: "user1" }
        // missing decide and perform
      ];
      
      expect(isDocumentValid(doc, roles, [])).toBe(false);
    });
  });
});
