/**
 * RBAC Cross-Role Permission Tests
 * Tests the `can()` function from permissions.ts — no DB required.
 * Verifies that RAPID governance roles have exactly the rights they should,
 * and critically, that they CANNOT perform actions outside their role.
 */
import { describe, it, expect } from "vitest";
import { can } from "../middleware/permissions";

describe("RAPID RBAC — viewer is strictly read-only", () => {
  it("cannot create documents",   () => expect(can("viewer", "document:create")).toBe(false));
  it("cannot submit documents",   () => expect(can("viewer", "document:submit")).toBe(false));
  it("cannot approve documents",  () => expect(can("viewer", "document:approve")).toBe(false));
  it("cannot reject documents",   () => expect(can("viewer", "document:reject")).toBe(false));
  it("cannot finalize documents", () => expect(can("viewer", "document:finalize")).toBe(false));
  it("cannot recommend",          () => expect(can("viewer", "document:recommend")).toBe(false));
  it("cannot add evidence",       () => expect(can("viewer", "evidence:add")).toBe(false));
  it("CAN read documents",        () => expect(can("viewer", "document:read")).toBe(true));
  it("CAN read ledger",           () => expect(can("viewer", "ledger:read")).toBe(true));
});

describe("RAPID RBAC — recommender cannot approve or finalize", () => {
  it("cannot approve",            () => expect(can("recommender", "document:approve")).toBe(false));
  it("cannot reject",             () => expect(can("recommender", "document:reject")).toBe(false));
  it("cannot finalize",           () => expect(can("recommender", "document:finalize")).toBe(false));
  it("cannot create",             () => expect(can("recommender", "document:create")).toBe(false));
  it("cannot submit",             () => expect(can("recommender", "document:submit")).toBe(false));
  it("CAN recommend",             () => expect(can("recommender", "document:recommend")).toBe(true));
  it("CAN add evidence",          () => expect(can("recommender", "evidence:add")).toBe(true));
  it("CAN read documents",        () => expect(can("recommender", "document:read")).toBe(true));
});

describe("RAPID RBAC — approver cannot create or finalize", () => {
  it("cannot create",             () => expect(can("approver", "document:create")).toBe(false));
  it("cannot finalize",           () => expect(can("approver", "document:finalize")).toBe(false));
  it("cannot recommend",          () => expect(can("approver", "document:recommend")).toBe(false));
  it("cannot submit",             () => expect(can("approver", "document:submit")).toBe(false));
  it("CAN approve",               () => expect(can("approver", "document:approve")).toBe(true));
  it("CAN reject",                () => expect(can("approver", "document:reject")).toBe(true));
});

describe("RAPID RBAC — performer executes, never governs", () => {
  it("cannot create",             () => expect(can("performer", "document:create")).toBe(false));
  it("cannot approve",            () => expect(can("performer", "document:approve")).toBe(false));
  it("cannot reject",             () => expect(can("performer", "document:reject")).toBe(false));
  it("cannot recommend",          () => expect(can("performer", "document:recommend")).toBe(false));
  it("cannot submit",             () => expect(can("performer", "document:submit")).toBe(false));
  it("CAN finalize (execute)",    () => expect(can("performer", "document:finalize")).toBe(true));
});

describe("RAPID RBAC — creator initiates, cannot approve own submissions", () => {
  it("cannot approve",            () => expect(can("creator", "document:approve")).toBe(false));
  it("cannot reject",             () => expect(can("creator", "document:reject")).toBe(false));
  it("cannot finalize",           () => expect(can("creator", "document:finalize")).toBe(false));
  it("CAN create",                () => expect(can("creator", "document:create")).toBe(true));
  it("CAN submit",                () => expect(can("creator", "document:submit")).toBe(true));
  it("CAN update",                () => expect(can("creator", "document:update")).toBe(true));
});

describe("RAPID RBAC — admin has full governance access", () => {
  it("can create",                () => expect(can("admin", "document:create")).toBe(true));
  it("can approve",               () => expect(can("admin", "document:approve")).toBe(true));
  it("can finalize",              () => expect(can("admin", "document:finalize")).toBe(true));
  it("can recommend",             () => expect(can("admin", "document:recommend")).toBe(true));
  it("can assign roles",          () => expect(can("admin", "role:assign")).toBe(true));
  it("can manage users",          () => expect(can("admin", "user:create")).toBe(true));
});

describe("RAPID separation of duties — governance invariants", () => {
  it("Recommend and Approve are always separate roles", () => {
    expect(can("recommender", "document:approve")).toBe(false);
    expect(can("approver", "document:recommend")).toBe(false);
  });

  it("viewer has zero write permissions", () => {
    const writes = [
      "document:create", "document:update", "document:submit",
      "document:approve", "document:reject", "document:finalize",
      "document:recommend", "evidence:add", "user:create",
    ];
    writes.forEach(p => expect(can("viewer", p)).toBe(false));
  });

  it("unknown role returns false (no default escalation)", () => {
    // @ts-expect-error -- testing invalid input type intentionally — intentional invalid role test
    expect(can("hacker", "document:finalize")).toBe(false);
    // @ts-expect-error -- testing invalid input type intentionally
    expect(can("", "document:read")).toBe(false);
  });
});
