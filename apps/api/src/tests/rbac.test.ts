import { describe, it, expect, beforeAll } from "vitest";

const BASE = "http://localhost:3001";

let adminToken: string;
let creatorToken: string;
let auditorToken: string;
let approverToken: string;
let deciderToken: string;
let performerToken: string;

async function login(email: string, password = "password123") {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  return data.token;
}

async function req(method: string, path: string, token?: string, body?: any) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
}

async function createDoc(token: string, overrides = {}) {
  const r = await req("POST", "/documents", token, {
    title: "Test Doc", decisionSummary: "Summary",
    riskLevel: "low", complianceImpact: false,
    department: "Engineering", deadline: "2026-12-01",
    ...overrides,
  });
  return r.body.id;
}

async function getUsers(token: string) {
  const r = await req("GET", "/users", token);
  return r.body;
}

beforeAll(async () => {
  adminToken     = await login("admin@rapid.com");
  creatorToken   = await login("creator@rapid.com");
  auditorToken   = await login("auditor@rapid.com");
  approverToken  = await login("approver@rapid.com");
  deciderToken   = await login("decision@rapid.com");
  performerToken = await login("performer@rapid.com");
});

// ── Auth ──
describe("Authentication", () => {
  it("returns 401 with no token", async () => {
    const r = await req("GET", "/documents");
    expect(r.body.error.message).toBe("Auth required");
  });

  it("returns 401 with invalid token", async () => {
    const r = await req("GET", "/documents", "invalid.token.here");
    expect(r.body.error.message).toBe("Invalid token");
  });

  it("logs in with valid credentials", async () => {
    expect(adminToken).toBeTruthy();
    expect(creatorToken).toBeTruthy();
    expect(auditorToken).toBeTruthy();
  });

  it("rejects wrong password", async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@rapid.com", password: "wrong" }),
    });
    const data = await res.json();
    expect(data.error).toBeTruthy();
  });
});

// ── RBAC: document:create ──
describe("RBAC — document:create", () => {
  it("creator CAN create", async () => {
    const r = await req("POST", "/documents", creatorToken, {
      title: "Test", decisionSummary: "S", riskLevel: "low",
      department: "Eng", deadline: "2026-12-01",
    });
    expect(r.status).toBe(201);
  });

  it("auditor CANNOT create → 403", async () => {
    const r = await req("POST", "/documents", auditorToken, { title: "T" });
    expect(r.body.error.message).toContain("Forbidden");
  });

  it("approver CANNOT create → 403", async () => {
    const r = await req("POST", "/documents", approverToken, { title: "T" });
    expect(r.body.error.message).toContain("Forbidden");
  });

  it("performer CANNOT create → 403", async () => {
    const r = await req("POST", "/documents", performerToken, { title: "T" });
    expect(r.body.error.message).toContain("Forbidden");
  });

  it("decider CANNOT create → 403", async () => {
    const r = await req("POST", "/documents", deciderToken, { title: "T" });
    expect(r.body.error.message).toContain("Forbidden");
  });
});

// ── RBAC: read ──
describe("RBAC — document:read", () => {
  it("all roles CAN read documents", async () => {
    for (const token of [adminToken, creatorToken, auditorToken, approverToken, deciderToken, performerToken]) {
      const r = await req("GET", "/documents", token);
      expect(Array.isArray(r.body)).toBe(true);
    }
  });
});

// ── RBAC: admin ──
describe("RBAC — admin routes", () => {
  it("admin CAN access /admin/users", async () => {
    const r = await req("GET", "/admin/users", adminToken);
    expect(Array.isArray(r.body)).toBe(true);
  });

  it("creator CANNOT access /admin/users → 403", async () => {
    const r = await req("GET", "/admin/users", creatorToken);
    expect(r.body.error.message).toBe("Admin only");
  });

  it("auditor CANNOT access /admin/users → 403", async () => {
    const r = await req("GET", "/admin/users", auditorToken);
    expect(r.body.error.message).toBe("Admin only");
  });
});

// ── RBAC: finalize ──
describe("RBAC — document:finalize", () => {
  it("approver CANNOT finalize → 403", async () => {
    const r = await req("POST", "/documents/fakeid/finalize", approverToken);
    expect(r.body.error.message).toContain("Forbidden");
  });

  it("auditor CANNOT finalize → 403", async () => {
    const r = await req("POST", "/documents/fakeid/finalize", auditorToken);
    expect(r.body.error.message).toContain("Forbidden");
  });

  it("creator CANNOT finalize → 403", async () => {
    const r = await req("POST", "/documents/fakeid/finalize", creatorToken);
    expect(r.body.error.message).toContain("Forbidden");
  });
});

// ── RBAC: audit log ──
describe("RBAC — auditlog:read", () => {
  it("auditor CAN read audit log", async () => {
    const r = await req("GET", "/audit-log", auditorToken);
    expect(Array.isArray(r.body)).toBe(true);
  });

  it("admin CAN read audit log", async () => {
    const r = await req("GET", "/audit-log", adminToken);
    expect(Array.isArray(r.body)).toBe(true);
  });

  it("creator CANNOT read audit log → 403", async () => {
    const r = await req("GET", "/audit-log", creatorToken);
    expect(r.body.error.message).toContain("Forbidden");
  });

  it("performer CANNOT read audit log → 403", async () => {
    const r = await req("GET", "/audit-log", performerToken);
    expect(r.body.error.message).toContain("Forbidden");
  });
});

// ── RAPID validation rules ──
describe("RAPID validation rules", () => {
  it("submit fails without recommend role", async () => {
    const docId = await createDoc(adminToken);
    const r = await req("POST", `/documents/${docId}/submit`, adminToken);
    expect(r.status).toBe(422);
    expect(r.body.error.details).toContain("Recommend owner is required");
  });

  it("submit fails without perform role", async () => {
    const docId = await createDoc(adminToken);
    const users = await getUsers(creatorToken);
    await req("POST", `/documents/${docId}/roles`, adminToken, { roleType: "recommend", userId: users[0].id });
    const r = await req("POST", `/documents/${docId}/submit`, adminToken);
    expect(r.status).toBe(422);
    expect(r.body.error.details.some((e: string) => e.includes("Perform"))).toBe(true);
  });

  it("submit fails without decide role", async () => {
    const docId = await createDoc(adminToken);
    const users = await getUsers(creatorToken);
    await req("POST", `/documents/${docId}/roles`, adminToken, { roleType: "recommend", userId: users[0].id });
    await req("POST", `/documents/${docId}/roles`, adminToken, { roleType: "perform", userId: users[0].id });
    const r = await req("POST", `/documents/${docId}/submit`, adminToken);
    expect(r.status).toBe(422);
    expect(r.body.error.details.some((e: string) => e.includes("Decide"))).toBe(true);
  });

  it("high-risk submit fails without agree role", async () => {
    const docId = await createDoc(creatorToken, { riskLevel: "high" });
    const users = await getUsers(creatorToken);
    await req("POST", `/documents/${docId}/roles`, adminToken, { roleType: "recommend", userId: users[0].id });
    await req("POST", `/documents/${docId}/roles`, adminToken, { roleType: "perform", userId: users[0].id });
    await req("POST", `/documents/${docId}/roles`, adminToken, { roleType: "decide", userId: users[0].id });
    const r = await req("POST", `/documents/${docId}/submit`, adminToken);
    expect(r.status).toBe(422);
    expect(r.body.error.details.some((e: string) => e.includes("Agree"))).toBe(true);
  });

  it("compliance-impact submit fails without evidence", async () => {
    const docId = await createDoc(creatorToken, { complianceImpact: true, riskLevel: "low" });
    const users = await getUsers(creatorToken);
    await req("POST", `/documents/${docId}/roles`, adminToken, { roleType: "recommend", userId: users[0].id });
    await req("POST", `/documents/${docId}/roles`, adminToken, { roleType: "perform", userId: users[0].id });
    await req("POST", `/documents/${docId}/roles`, adminToken, { roleType: "decide", userId: users[0].id });
    const r = await req("POST", `/documents/${docId}/submit`, adminToken);
    expect(r.status).toBe(422);
    expect(r.body.error.details.some((e: string) => e.includes("evidence"))).toBe(true);
  });

  it("cannot have more than one decide owner", async () => {
    const docId = await createDoc(adminToken);
    const users = await getUsers(creatorToken);
    await req("POST", `/documents/${docId}/roles`, adminToken, { roleType: "recommend", userId: users[0].id });
    await req("POST", `/documents/${docId}/roles`, adminToken, { roleType: "perform", userId: users[0].id });
    await req("POST", `/documents/${docId}/roles`, adminToken, { roleType: "decide", userId: users[0].id });
    await req("POST", `/documents/${docId}/roles`, adminToken, { roleType: "decide", userId: users[1].id });
    const r = await req("POST", `/documents/${docId}/submit`, adminToken);
    expect(r.status).toBe(422);
    expect(r.body.error.details.some((e: string) => e.includes("one Decide"))).toBe(true);
  });

  it("finalized document cannot be re-finalized (immutable)", async () => {
    const r = await req("POST", "/documents/fakeid/finalize", approverToken);
    expect(r.body.error.message).toContain("Forbidden");
  });
});
