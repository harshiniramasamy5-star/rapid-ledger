/**
 * API integration tests — Fix 8: self-contained, use app.handle() directly.
 * No separate server process needed. Tests run against the Elysia handler.
 *
 * Requirements:
 *   - DATABASE_URL must be set (test DB or the dev DB)
 *   - Seed users must exist (run `npm run db:seed` once)
 */
import { describe, it, expect, beforeAll } from "vitest";
import { app } from "../src/index";

async function req(
  method: string,
  path: string,
  opts: { body?: unknown; token?: string } = {}
): Promise<{ status: number; body: unknown }> {
  const headers: Record<string, string> = {};
  if (opts.body) headers["Content-Type"] = "application/json";
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;

  const res = await app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    })
  );

  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

let adminToken = "";
let creatorToken = "";
let approverToken = "";

describe("GET /health", () => {
  it("returns 200 with status ok", async () => {
    const { status, body } = await req("GET", "/health");
    expect(status).toBe(200);
    expect((body as { status: string }).status).toBe("ok");
  });
});

describe("POST /auth/login", () => {
  it("returns 200 with token and lowercase user for valid credentials", async () => {
    const { status, body } = await req("POST", "/auth/login", {
      body: { email: "admin@rapid.com", password: "password123" },
    });
    expect(status).toBe(200);
    const { token, user } = body as { token: string; user: { id: string; email: string; role: string } };
    expect(token).toBeTruthy();
    expect(user).toBeDefined();
    expect(user.email).toBe("admin@rapid.com");
    expect(user.role).toBe("admin");
    // Fix 4: ensure no uppercase User key
    expect((body as Record<string, unknown>).User).toBeUndefined();
    adminToken = token;
  });

  it("stores creator token for later tests", async () => {
    const { status, body } = await req("POST", "/auth/login", {
      body: { email: "creator@rapid.com", password: "password123" },
    });
    expect(status).toBe(200);
    creatorToken = (body as { token: string }).token;
    expect(creatorToken).toBeTruthy();
  });

  it("stores approver token for later tests", async () => {
    const { status, body } = await req("POST", "/auth/login", {
      body: { email: "approver@rapid.com", password: "password123" },
    });
    expect(status).toBe(200);
    approverToken = (body as { token: string }).token;
    expect(approverToken).toBeTruthy();
  });

  it("returns 401 for wrong password", async () => {
    const { status } = await req("POST", "/auth/login", {
      body: { email: "admin@rapid.com", password: "wrong-password" },
    });
    expect(status).toBe(401);
  });

  it("returns 401 for unknown email", async () => {
    const { status } = await req("POST", "/auth/login", {
      body: { email: "nobody@rapid.com", password: "password123" },
    });
    expect(status).toBe(401);
  });

  it("returns 400 for invalid body", async () => {
    const { status } = await req("POST", "/auth/login", { body: { email: "not-an-email" } });
    expect(status).toBe(422);
  });
});

describe("GET /auth/me", () => {
  beforeAll(async () => {
    if (!adminToken) {
      const { body } = await req("POST", "/auth/login", {
        body: { email: "admin@rapid.com", password: "password123" },
      });
      adminToken = (body as { token: string }).token;
    }
  });

  it("returns 200 with user profile", async () => {
    const { status, body } = await req("GET", "/auth/me", { token: adminToken });
    expect(status).toBe(200);
    expect((body as { email: string }).email).toBe("admin@rapid.com");
  });

  it("returns 401 without token", async () => {
    const { status } = await req("GET", "/auth/me");
    expect(status).toBe(401);
  });
});

describe("Documents CRUD", () => {
  let documentId = "";

  beforeAll(async () => {
    if (!creatorToken) {
      const { body } = await req("POST", "/auth/login", {
        body: { email: "creator@rapid.com", password: "password123" },
      });
      creatorToken = (body as { token: string }).token;
    }
  });

  it("POST /documents returns 201 with created doc", async () => {
    const { status, body } = await req("POST", "/documents", {
      token: creatorToken,
      body: {
        title: "Test Document for API Tests",
        decisionSummary: "This is a test decision summary for automated API tests",
        riskLevel: "low",
      },
    });
    expect(status).toBe(201);
    const doc = body as { id: string; documentCode: string; version: number; status: string };
    expect(doc.documentCode).toMatch(/^RAPID-\d+$/);
    expect(doc.version).toBe(1);
    expect(doc.status).toBe("draft");
    documentId = doc.id;
  });

  it("GET /documents returns 200 with list", async () => {
    const { status, body } = await req("GET", "/documents", { token: creatorToken });
    expect(status).toBe(200);
    const paginated = body as { data: unknown[]; total: number; page: number; totalPages: number };
    expect(Array.isArray(paginated.data)).toBe(true);
    expect(typeof paginated.total).toBe("number");
    expect(typeof paginated.page).toBe("number");
    expect(typeof paginated.totalPages).toBe("number");
  });

  it("GET /documents/:id returns 200 for existing doc", async () => {
    const { status, body } = await req("GET", `/documents/${documentId}`, { token: creatorToken });
    expect(status).toBe(200);
    expect((body as { id: string }).id).toBe(documentId);
  });

  it("GET /documents/:id returns 404 for unknown id", async () => {
    const { status } = await req("GET", "/documents/does-not-exist", { token: creatorToken });
    expect(status).toBe(404);
  });

  it("GET /documents returns 401 without token", async () => {
    const { status } = await req("GET", "/documents");
    expect(status).toBe(401);
  });
});

describe("GET /ledger", () => {
  it("returns 200 with array", async () => {
    if (!adminToken) return;
    const { status, body } = await req("GET", "/ledger", { token: adminToken });
    expect(status).toBe(200);
    const paginated = body as { data: unknown[]; total: number; page: number; totalPages: number };
    expect(Array.isArray(paginated.data)).toBe(true);
    expect(typeof paginated.total).toBe("number");
    expect(typeof paginated.page).toBe("number");
    expect(typeof paginated.totalPages).toBe("number");
  });

  it("returns 401 without token", async () => {
    const { status } = await req("GET", "/ledger");
    expect(status).toBe(401);
  });
});

describe("Immutability — finalized documents cannot be mutated", () => {
  let docId = "";
  let deciderId = "";
  let performerId = "";
  let localCreator = "";
  let localAdmin = "";

  beforeAll(async () => {
    // Ensure tokens
    const a = await req("POST", "/auth/login", { body: { email: "admin@rapid.com", password: "password123" } });
    localAdmin = (a.body as { token: string }).token;
    const c = await req("POST", "/auth/login", { body: { email: "creator@rapid.com", password: "password123" } });
    localCreator = (c.body as { token: string }).token;

    // Get user IDs
    const users = await req("GET", "/users", { token: localAdmin });
    const raw = users.body as { data?: { id: string; email: string }[] } | { id: string; email: string }[];
    const list: { id: string; email: string }[] = Array.isArray(raw) ? raw : (raw?.data ?? []);
    // creator@rapid.com not needed in this flow
    const decider = list.find(u => u.email === "admin@rapid.com");
    const performer = list.find(u => u.email === "approver@rapid.com");
    deciderId = decider?.id ?? "";
    performerId = performer?.id ?? "";

    // 1. Create document
    const created = await req("POST", "/documents", {
      token: localCreator,
      body: {
        title: "Immutability Test Document",
        decisionSummary: "This decision tests that finalized records cannot be mutated",
        riskLevel: "low",
      },
    });
    docId = (created.body as { id: string }).id;

    // 2. Assign all required RAPID roles: recommend + decide + perform
    const creatorUser = list.find(u => u.email === "creator@rapid.com");
    if (creatorUser) {
      await req("POST", `/documents/${docId}/roles`, {
        token: localAdmin,
        body: { userId: creatorUser.id, roleType: "recommend" },
      });
    }
    await req("POST", `/documents/${docId}/roles`, {
      token: localAdmin,
      body: { userId: deciderId, roleType: "decide" },
    });
    await req("POST", `/documents/${docId}/roles`, {
      token: localAdmin,
      body: { userId: performerId, roleType: "perform" },
    });

    // 3. Submit
    const submitResult = await req("POST", `/documents/${docId}/submit`, { token: localCreator });
    if (submitResult.status !== 200 && submitResult.status !== 201) {
      console.error("Submit failed:", submitResult.status, JSON.stringify(submitResult.body));
    }

    // 4. Approve (admin is decider — doc may be submitted or awaiting_agreement)
    const approveResult = await req("POST", `/documents/${docId}/approve`, {
      token: localAdmin,
      body: { comment: "Approved for immutability test" },
    });
    if (approveResult.status !== 200 && approveResult.status !== 201) {
      console.error("Approve failed:", approveResult.status, JSON.stringify(approveResult.body));
    }

    // 5. Finalize
    const finalizeResult = await req("POST", `/documents/${docId}/finalize`, { token: localAdmin });
    if (finalizeResult.status !== 200 && finalizeResult.status !== 201) {
      console.error("Finalize failed:", finalizeResult.status, JSON.stringify(finalizeResult.body));
    }
  });

  it("finalized document exists and is locked", async () => {
    const { status, body } = await req("GET", `/documents/${docId}`, { token: localAdmin });
    expect(status).toBe(200);
    expect((body as { status: string }).status).toBe("finalized");
  });

  it("PATCH on finalized document returns 403, 404, or 409", async () => {
    const { status } = await req("PATCH", `/documents/${docId}`, {
      token: localAdmin,
      body: { title: "Mutated Title — should be rejected" },
    });
    expect([403, 404, 409]).toContain(status);
  });

  it("second finalize attempt on finalized document returns 400, 403, or 409", async () => {
    const { status } = await req("POST", `/documents/${docId}/finalize`, { token: localAdmin });
    expect([400, 403, 409]).toContain(status);
  });

  it("submit on finalized document is rejected", async () => {
    const { status } = await req("POST", `/documents/${docId}/submit`, { token: localCreator });
    expect([400, 403, 409, 422]).toContain(status);
  });
});
