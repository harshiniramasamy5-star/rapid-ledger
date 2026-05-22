import { describe, it, expect, beforeAll } from "vitest";

// Note: These tests require the API server to be running
// Run: npm run dev (in another terminal)

const API_URL = "http://localhost:3001";

describe("API Endpoints", () => {
  let adminToken: string;
  let creatorToken: string;
  let approverToken: string;
  let deciderToken: string;
  let auditorToken: string;
  let testDocId: string;

  beforeAll(async () => {
    // Get tokens for different users
    const adminRes = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@rapid.com", password: "password123" })
    });
    const adminData = await adminRes.json();
    adminToken = adminData.token;

    const creatorRes = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "creator@rapid.com", password: "password123" })
    });
    const creatorData = await creatorRes.json();
    creatorToken = creatorData.token;

    const approverRes = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "approver@rapid.com", password: "password123" })
    });
    const approverData = await approverRes.json();
    approverToken = approverData.token;

    const deciderRes = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "decider@rapid.com", password: "password123" })
    });
    const deciderData = await deciderRes.json();
    deciderToken = deciderData.token;

    const auditorRes = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "auditor@rapid.com", password: "password123" })
    });
    const auditorData = await auditorRes.json();
    auditorToken = auditorData.token;
  });

  describe("GET /health", () => {
    it("should return health status", async () => {
      const res = await fetch(`${API_URL}/health`);
      const data = await res.json();
      
      expect(res.status).toBe(200);
      expect(data.status).toBe("ok");
      expect(data.service).toBe("rapid-ledger-api");
    });
  });

  describe("POST /auth/login", () => {
    it("should login with valid credentials", async () => {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "creator@rapid.com", password: "password123" })
      });
      const data = await res.json();
      
      expect(res.status).toBe(200);
      expect(data.token).toBeDefined();
      expect(typeof data.token).toBe("string");
    });

    it("should reject invalid credentials", async () => {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "creator@rapid.com", password: "wrongpassword" })
      });
      const data = await res.json();
      
      expect(res.status).toBe(401);
      expect(data.error).toBeDefined();
    });
  });

  describe("GET /auth/me", () => {
    it("should return current user info", async () => {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${creatorToken}` }
      });
      const data = await res.json();
      
      expect(res.status).toBe(200);
      expect(data.email).toBe("creator@rapid.com");
      expect(data.role).toBe("creator");
    });

    it("should reject request without token", async () => {
      const res = await fetch(`${API_URL}/auth/me`);
      const data = await res.json();
      
      expect(res.status).toBe(401);
    });
  });

  describe("GET /users", () => {
    it("should return list of users", async () => {
      const res = await fetch(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const data = await res.json();
      
      expect(res.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
    });
  });

  describe("POST /documents", () => {
    it("should create a new document", async () => {
      const res = await fetch(`${API_URL}/documents`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${creatorToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: "Test API Document",
          decisionSummary: "This is a test",
          riskLevel: "low",
          complianceImpact: false,
          department: "Engineering",
          deadline: new Date(Date.now() + 30 * 86400000).toISOString()
        })
      });
      const data = await res.json();
      
      console.log("POST /documents response:", JSON.stringify(data, null, 2));
      console.log("Status:", res.status);
      
      
      expect(res.status).toBe(201);
      expect(data.id).toBeDefined();
      expect(data.status).toBe("draft");
      expect(data.documentCode).toMatch(/RAPID-\d+/);
      
      testDocId = data.id;
      console.log("Set testDocId to:", testDocId);
      
      // Small delay to ensure document is fully persisted
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  });

  describe("GET /documents", () => {
    it("should return list of documents", async () => {
      const res = await fetch(`${API_URL}/documents`, {
        headers: { Authorization: `Bearer ${creatorToken}` }
      });
      const data = await res.json();
      
      expect(res.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe("GET /documents/:id", () => {
    it("should return document details", async () => {
      console.log("Fetching document with ID:", testDocId);
      const res = await fetch(`${API_URL}/documents/${testDocId}`, {
        headers: { Authorization: `Bearer ${creatorToken}` }
      });
      const data = await res.json();
      
      expect(res.status).toBe(200);
      expect(data.id).toBe(testDocId);
      expect(data.title).toBe("Test API Document");
    });
  });

  describe("GET /audit-log", () => {
    it("should return audit log entries", async () => {
      const res = await fetch(`${API_URL}/audit-log`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const data = await res.json();
      
      expect(res.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    it("should filter audit log by action", async () => {
      const res = await fetch(`${API_URL}/audit-log?action=document_created`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const data = await res.json();
      
      expect(res.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      if (data.length > 0) {
        expect(data.every((entry: any) => entry.action === "document_created")).toBe(true);
      }
    });
  });

  describe("GET /ledger", () => {
    it("should return ledger entries", async () => {
      const res = await fetch(`${API_URL}/ledger`, {
        headers: { Authorization: `Bearer ${auditorToken}` }
      });
      const data = await res.json();
      
      expect(res.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe("GET /ledger/export", () => {
    it("should export ledger as CSV", async () => {
      const res = await fetch(`${API_URL}/ledger/export`, {
        headers: { Authorization: `Bearer ${auditorToken}` }
      });
      const text = await res.text();
      
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/csv");
      expect(text).toContain("Code,Title");
    });
  });
});
