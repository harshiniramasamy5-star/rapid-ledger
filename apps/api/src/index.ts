
function handleApproval(params: any, body: any, headers: any, set: any, approvalStatus: string, docStatus: string) {
  const auth = headers["authorization"];
  if (!auth) { set.status = 401; return { error: { message: "Auth required" } }; }
  try {
    const { execSync } = require("child_process");
    const pathLib = require("path");
    const DB = pathLib.join(process.env.HOME, "rapid-ledger", "apps", "api", "dev.db");
    function q(sql: string) {
      try { const r = execSync(`sqlite3 -json "${DB}" ${JSON.stringify(sql)}`,{stdio:"pipe"}).toString().trim(); return r?JSON.parse(r):[]; } catch { return []; }
    }
    function run(sql: string) { try { execSync(`sqlite3 "${DB}" ${JSON.stringify(sql)}`,{stdio:"pipe"}); } catch(e:any){console.error(e.message);} }
    const now = new Date().toISOString();
    const notes = body?.notes ?? "";
    run(`UPDATE Approval SET status='${approvalStatus}', notes='${notes}', updatedAt='${now}' WHERE id='${params.approvalId}'`);
    if (approvalStatus === "approved") {
      const pending = q(`SELECT * FROM Approval WHERE documentId='${params.id}' AND status='pending'`);
      if (pending.length === 0) {
        run(`UPDATE RapidDocument SET status='approved', updatedAt='${now}' WHERE id='${params.id}'`);
      }
    } else {
      run(`UPDATE RapidDocument SET status='${docStatus}', updatedAt='${now}' WHERE id='${params.id}'`);
    }
    return { ok: true, status: approvalStatus };
  } catch(e: any) { set.status = 500; return { error: { message: e.message } }; }
}

import { Elysia } from "elysia";
import { node } from "@elysiajs/node";
import { cors } from "@elysiajs/cors";
import { execSync } from "child_process";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import path from "path";

const DB = path.join(process.env.HOME!, "rapid-ledger", "apps", "api", "dev.db");
const JWT_SECRET = process.env.JWT_SECRET ?? "rapid-ledger-dev-secret";
const PORT = parseInt(process.env.PORT ?? "3001");

function query(sql: string): any[] {
  try {
    const result = execSync(`sqlite3 -json "${DB}" ${JSON.stringify(sql)}`, { stdio: "pipe" }).toString().trim();
    return result ? JSON.parse(result) : [];
  } catch { return []; }
}

const app = new Elysia({ adapter: node() })
  .use(cors({ origin: true, allowedHeaders: ["Content-Type", "Authorization"], methods: ["GET","POST","PUT","DELETE","OPTIONS"], credentials: true }))

  .get("/health", () => ({ status: "ok", service: "rapid-ledger-api", version: "1.0.0", timestamp: new Date().toISOString() }))

  .post("/auth/login", async ({ body, set }: any) => {
    const { email, password } = body;
    const users = query(`SELECT * FROM User WHERE email='${email}' AND isActive=1 LIMIT 1`);
    if (!users.length) { set.status = 401; return { error: { message: "Invalid email or password" } }; }
    const user = users[0];
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) { set.status = 401; return { error: { message: "Invalid email or password" } }; }
    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    const { passwordHash, ...safe } = user;
    return { token, user: safe };
  })

  .get("/auth/me", ({ headers, set }: any) => {
    const auth = headers["authorization"];
    if (!auth) { set.status = 401; return { error: { message: "Auth required" } }; }
    try {
      const payload = jwt.verify(auth.slice(7), JWT_SECRET) as any;
      const users = query(`SELECT id,name,email,role,department,isActive,createdAt,updatedAt FROM User WHERE id='${payload.userId}' LIMIT 1`);
      if (!users.length) { set.status = 401; return { error: { message: "User not found" } }; }
      return users[0];
    } catch { set.status = 401; return { error: { message: "Invalid token" } }; }
  })

  .get("/users", ({ headers, set }: any) => {
    const auth = headers["authorization"];
    if (!auth) { set.status = 401; return { error: { message: "Auth required" } }; }
    try {
      jwt.verify(auth.slice(7), JWT_SECRET);
      return query(`SELECT id,name,email,role,department,isActive,createdAt,updatedAt FROM User ORDER BY name`);
    } catch { set.status = 401; return { error: { message: "Invalid token" } }; }
  })

  .get("/documents", ({ headers, set }: any) => {
    const auth = headers["authorization"];
    if (!auth) { set.status = 401; return { error: { message: "Auth required" } }; }
    try {
      jwt.verify(auth.slice(7), JWT_SECRET);
      const docs = query(`SELECT * FROM RapidDocument ORDER BY updatedAt DESC`);
      return docs.map((doc: any) => ({
        ...doc,
        complianceImpact: doc.complianceImpact === 1,
        roleAssignments: query(`SELECT r.*,u.name,u.email FROM RapidRoleAssignment r JOIN User u ON r.userId=u.id WHERE r.documentId='${doc.id}'`),
        evidence: query(`SELECT * FROM Evidence WHERE documentId='${doc.id}'`),
      }));
    } catch { set.status = 401; return { error: { message: "Invalid token" } }; }
  })


  .get("/documents/:id", ({ params, headers, set }: any) => {
    const auth = headers["authorization"];
    if (!auth) { set.status = 401; return { error: { message: "Auth required" } }; }
    try {
      const { execSync } = require("child_process");
      const path = require("path");
      const DB = path.join(process.env.HOME, "rapid-ledger", "apps", "api", "dev.db");
      function q(sql: string) {
        try {
          const r = execSync(`sqlite3 -json "${DB}" ${JSON.stringify(sql)}`, {stdio:"pipe"}).toString().trim();
          return r ? JSON.parse(r) : [];
        } catch { return []; }
      }
      const docs = q(`SELECT * FROM RapidDocument WHERE id='${params.id}' LIMIT 1`);
      if (!docs.length) { set.status = 404; return { error: { message: "Not found" } }; }
      const doc = docs[0];
      doc.complianceImpact = doc.complianceImpact === 1;
      doc.roleAssignments = q(`SELECT r.*,u.name,u.email FROM RapidRoleAssignment r JOIN User u ON r.userId=u.id WHERE r.documentId='${params.id}'`);
      doc.evidence = q(`SELECT * FROM Evidence WHERE documentId='${params.id}'`);
      return doc;
    } catch { set.status = 401; return { error: { message: "Invalid token" } }; }
  })

  .post("/documents/:id/submit", ({ params, headers, set }: any) => {
    const auth = headers["authorization"];
    if (!auth) { set.status = 401; return { error: { message: "Auth required" } }; }
    try {
      const { execSync } = require("child_process");
      const path = require("path");
      const DB = path.join(process.env.HOME, "rapid-ledger", "apps", "api", "dev.db");
      function q(sql: string) {
        try {
          const r = execSync(`sqlite3 -json "${DB}" ${JSON.stringify(sql)}`, {stdio:"pipe"}).toString().trim();
          return r ? JSON.parse(r) : [];
        } catch { return []; }
      }
      function run(sql: string) {
        try { execSync(`sqlite3 "${DB}" ${JSON.stringify(sql)}`, {stdio:"pipe"}); } catch(e: any) { console.error(e.message); }
      }
      const docs = q(`SELECT * FROM RapidDocument WHERE id='${params.id}' LIMIT 1`);
      if (!docs.length) { set.status = 404; return { error: { message: "Not found" } }; }
      const doc = docs[0];
      if (doc.status !== "draft") { set.status = 422; return { error: { message: "Only draft documents can be submitted" } }; }
      const roles = q(`SELECT * FROM RapidRoleAssignment WHERE documentId='${params.id}'`);
      const errors = [];
      if (!roles.find((r: any) => r.roleType === "recommend")) errors.push({ message: "Recommend owner is required" });
      if (!roles.find((r: any) => r.roleType === "perform"))   errors.push({ message: "Perform owner is required" });
      const deciders = roles.filter((r: any) => r.roleType === "decide");
      if (deciders.length === 0) errors.push({ message: "Exactly one Decide owner is required" });
      if (deciders.length > 1)   errors.push({ message: "Only one Decide owner is allowed" });
      if ((doc.riskLevel === "high" || doc.riskLevel === "critical") && !roles.find((r: any) => r.roleType === "agree")) {
        errors.push({ message: "High risk decisions require at least one Agree approver" });
      }
      const evidence = q(`SELECT * FROM Evidence WHERE documentId='${params.id}'`);
      if (doc.complianceImpact === 1 && evidence.length === 0) {
        errors.push({ message: "Compliance-impacting decisions require at least one evidence item" });
      }
      if (errors.length > 0) {
        set.status = 422;
        return { error: { code: "VALIDATION_ERROR", message: "Document failed validation", details: errors } };
      }
      const agreeRoles = roles.filter((r: any) => r.roleType === "agree");
      const nextStatus = agreeRoles.length > 0 ? "awaiting_agreement" : "approved";
      const now = new Date().toISOString();
      run(`UPDATE RapidDocument SET status='${nextStatus}', submittedAt='${now}', updatedAt='${now}' WHERE id='${params.id}'`);
      for (const ar of agreeRoles) {
        const apId = `apr${Math.random().toString(36).slice(2,14)}`;
        run(`INSERT OR IGNORE INTO Approval (id,documentId,approverId,status,createdAt,updatedAt) VALUES ('${apId}','${params.id}','${ar.userId}','pending','${now}','${now}')`);
      }
      const updated = q(`SELECT * FROM RapidDocument WHERE id='${params.id}' LIMIT 1`);
      if (!updated.length) return { error: { message: "Not found" } };
      const result = updated[0];
      result.complianceImpact = result.complianceImpact === 1;
      result.roleAssignments = q(`SELECT r.*,u.name,u.email FROM RapidRoleAssignment r JOIN User u ON r.userId=u.id WHERE r.documentId='${params.id}'`);
      result.evidence = q(`SELECT * FROM Evidence WHERE documentId='${params.id}'`);
      return result;
    } catch(e: any) { set.status = 500; return { error: { message: e.message } }; }
  })


  .get("/approvals/my", ({ headers, set }: any) => {
    const auth = headers["authorization"];
    if (!auth) { set.status = 401; return { error: { message: "Auth required" } }; }
    try {
      const jwtLib = require("jsonwebtoken");
      const payload = jwtLib.verify(auth.slice(7), JWT_SECRET) as any;
      const { execSync } = require("child_process");
      const pathLib = require("path");
      const DB = pathLib.join(process.env.HOME, "rapid-ledger", "apps", "api", "dev.db");
      function q(sql: string) {
        try { const r = execSync(`sqlite3 -json "${DB}" ${JSON.stringify(sql)}`,{stdio:"pipe"}).toString().trim(); return r?JSON.parse(r):[]; } catch { return []; }
      }
      const approvals = q(`SELECT * FROM Approval WHERE approverId='${payload.userId}' AND status='pending'`);
      return approvals.map((a: any) => {
        const docs = q(`SELECT * FROM RapidDocument WHERE id='${a.documentId}' LIMIT 1`);
        a.document = docs[0] ?? null;
        return a;
      });
    } catch(e: any) { set.status = 401; return { error: { message: "Invalid token" } }; }
  })

  .post("/documents/:id/approvals/:approvalId/approve", async ({ params, body, headers, set }: any) => {
    return handleApproval(params, body, headers, set, "approved", "approved");
  })
  .post("/documents/:id/approvals/:approvalId/reject", async ({ params, body, headers, set }: any) => {
    return handleApproval(params, body, headers, set, "rejected", "rejected");
  })
  .post("/documents/:id/approvals/:approvalId/request-changes", async ({ params, body, headers, set }: any) => {
    return handleApproval(params, body, headers, set, "changes_requested", "needs_changes");
  })


  .post("/documents/:id/finalize", ({ params, headers, set }: any) => {
    const auth = headers["authorization"];
    if (!auth) { set.status = 401; return { error: { message: "Auth required" } }; }
    try {
      const jwtLib = require("jsonwebtoken");
      const payload = jwtLib.verify(auth.slice(7), JWT_SECRET) as any;
      const { execSync } = require("child_process");
      const pathLib = require("path");
      const DB = pathLib.join(process.env.HOME, "rapid-ledger", "apps", "api", "dev.db");
      function q(sql: string) {
        try { const r = execSync(`sqlite3 -json "${DB}" ${JSON.stringify(sql)}`,{stdio:"pipe"}).toString().trim(); return r?JSON.parse(r):[]; } catch { return []; }
      }
      function run(sql: string) { try { execSync(`sqlite3 "${DB}" ${JSON.stringify(sql)}`,{stdio:"pipe"}); } catch(e:any){console.error(e.message);} }

      const docs = q(`SELECT * FROM RapidDocument WHERE id='${params.id}' LIMIT 1`);
      if (!docs.length) { set.status = 404; return { error: { message: "Document not found" } }; }
      const doc = docs[0];

      if (doc.status !== "approved") {
        set.status = 422;
        return { error: { message: `Document must be approved before finalizing. Current status: ${doc.status}` } };
      }

      const roles = q(`SELECT * FROM RapidRoleAssignment WHERE documentId='${params.id}'`);
      const decideRole = roles.find((r: any) => r.roleType === "decide");
      const performRole = roles.find((r: any) => r.roleType === "perform");

      if (!decideRole) { set.status = 422; return { error: { message: "No Decide owner assigned" } }; }
      if (decideRole.userId !== payload.userId && payload.role !== "admin") {
        set.status = 403;
        return { error: { message: "Only the Decide owner can finalize this document" } };
      }

      const now = new Date().toISOString();
      run(`UPDATE RapidDocument SET status='finalized', finalizedAt='${now}', updatedAt='${now}' WHERE id='${params.id}'`);

      const ledgerId = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2,8);
      run(`INSERT OR REPLACE INTO LedgerEntry (id,documentId,documentCode,title,finalDecision,decideOwnerId,performOwnerId,riskLevel,complianceImpact,version,finalizedAt,createdAt) VALUES ('${ledgerId}','${params.id}','${doc.documentCode}','${doc.title}','${doc.proposedDecision ?? doc.decisionSummary}','${decideRole.userId}','${performRole?.userId ?? decideRole.userId}','${doc.riskLevel}',${doc.complianceImpact},${doc.version},'${now}','${now}')`);

      const updated = q(`SELECT * FROM RapidDocument WHERE id='${params.id}' LIMIT 1`);
      const result = updated[0];
      result.roleAssignments = q(`SELECT r.*,u.name,u.email FROM RapidRoleAssignment r JOIN User u ON r.userId=u.id WHERE r.documentId='${params.id}'`);
      result.evidence = q(`SELECT * FROM Evidence WHERE documentId='${params.id}'`);
      return result;
    } catch(e: any) { set.status = 500; return { error: { message: e.message } }; }
  })

  .get("/ledger", ({ headers, set }: any) => {
    const auth = headers["authorization"];
    if (!auth) { set.status = 401; return { error: { message: "Auth required" } }; }
    try {
      const { execSync } = require("child_process");
      const pathLib = require("path");
      const DB = pathLib.join(process.env.HOME, "rapid-ledger", "apps", "api", "dev.db");
      function q(sql: string) {
        try { const r = execSync(`sqlite3 -json "${DB}" ${JSON.stringify(sql)}`,{stdio:"pipe"}).toString().trim(); return r?JSON.parse(r):[]; } catch { return []; }
      }
      const entries = q(`SELECT * FROM LedgerEntry ORDER BY finalizedAt DESC`);
      return entries.map((e: any) => {
        const decider = q(`SELECT id,name,email FROM User WHERE id='${e.decideOwnerId}' LIMIT 1`);
        const performer = q(`SELECT id,name,email FROM User WHERE id='${e.performOwnerId}' LIMIT 1`);
        e.decideOwner = decider[0] ?? null;
        e.performOwner = performer[0] ?? null;
        return e;
      });
    } catch(e: any) { set.status = 500; return { error: { message: e.message } }; }
  })


  .post("/documents", async ({ body, headers, set }: any) => {
    const auth = headers["authorization"];
    if (!auth) { set.status = 401; return { error: { message: "Auth required" } }; }
    try {
      const jwtLib = require("jsonwebtoken");
      const payload = jwtLib.verify(auth.slice(7), JWT_SECRET) as any;
      const { execSync } = require("child_process");
      const pathLib = require("path");
      const DB = pathLib.join(process.env.HOME, "rapid-ledger", "apps", "api", "dev.db");
      function q(sql: string) {
        try { const r = execSync(`sqlite3 -json "${DB}" ${JSON.stringify(sql)}`,{stdio:"pipe"}).toString().trim(); return r?JSON.parse(r):[]; } catch { return []; }
      }
      function run(sql: string) { try { execSync(`sqlite3 "${DB}" ${JSON.stringify(sql)}`,{stdio:"pipe"}); } catch(e:any){console.error(e.message);} }

      const count = q(`SELECT COUNT(*) as c FROM RapidDocument`);
      const num = (count[0]?.c ?? 0) + 1;
      const code = "RAPID-" + String(num).padStart(3,"0");
      const id = "c" + Date.now().toString(36) + Math.random().toString(36).slice(2,8);
      const now = new Date().toISOString();
      const deadline = new Date(body.deadline).toISOString();
      const compliance = body.complianceImpact ? 1 : 0;

      run(`INSERT INTO RapidDocument (id,documentCode,title,decisionSummary,businessContext,problemStatement,proposedDecision,alternativesConsidered,riskLevel,complianceImpact,department,deadline,status,version,createdBy,createdAt,updatedAt) VALUES ('${id}','${code}','${body.title.replace(/'/g,"''")}','${(body.decisionSummary??"").replace(/'/g,"''")}','${(body.businessContext??"").replace(/'/g,"''")}','${(body.problemStatement??"").replace(/'/g,"''")}','${(body.proposedDecision??"").replace(/'/g,"''")}','${(body.alternativesConsidered??"").replace(/'/g,"''")}','${body.riskLevel}',${compliance},'${body.department}','${deadline}','draft',1,'${payload.userId}','${now}','${now}')`);

      const docs = q(`SELECT * FROM RapidDocument WHERE id='${id}' LIMIT 1`);
      set.status = 201;
      return docs[0];
    } catch(e: any) { set.status = 500; return { error: { message: e.message } }; }
  })

  .post("/documents/:id/roles", ({ params, body, headers, set }: any) => {
    const auth = headers["authorization"];
    if (!auth) { set.status = 401; return { error: { message: "Auth required" } }; }
    try {
      const { execSync } = require("child_process");
      const pathLib = require("path");
      const DB = pathLib.join(process.env.HOME, "rapid-ledger", "apps", "api", "dev.db");
      function run(sql: string) { try { execSync(`sqlite3 "${DB}" ${JSON.stringify(sql)}`,{stdio:"pipe"}); } catch(e:any){console.error(e.message);} }
      const id = "c" + Date.now().toString(36) + Math.random().toString(36).slice(2,8);
      const now = new Date().toISOString();
      run(`INSERT OR REPLACE INTO RapidRoleAssignment (id,documentId,roleType,userId,createdAt) VALUES ('${id}','${params.id}','${body.roleType}','${body.userId}','${now}')`);
      set.status = 201;
      return { ok: true, id };
    } catch(e: any) { set.status = 500; return { error: { message: e.message } }; }
  })

  .post("/documents/:id/evidence", ({ params, body, headers, set }: any) => {
    const auth = headers["authorization"];
    if (!auth) { set.status = 401; return { error: { message: "Auth required" } }; }
    try {
      const jwtLib = require("jsonwebtoken");
      const payload = jwtLib.verify(auth.slice(7), JWT_SECRET) as any;
      const { execSync } = require("child_process");
      const pathLib = require("path");
      const DB = pathLib.join(process.env.HOME, "rapid-ledger", "apps", "api", "dev.db");
      function run(sql: string) { try { execSync(`sqlite3 "${DB}" ${JSON.stringify(sql)}`,{stdio:"pipe"}); } catch(e:any){console.error(e.message);} }
      const id = "c" + Date.now().toString(36) + Math.random().toString(36).slice(2,8);
      const now = new Date().toISOString();
      run(`INSERT INTO Evidence (id,documentId,type,title,urlOrPath,description,uploadedBy,createdAt) VALUES ('${id}','${params.id}','${body.type}','${(body.title??"").replace(/'/g,"''")}','${(body.urlOrPath??"").replace(/'/g,"''")}','${(body.description??"").replace(/'/g,"''")}','${payload.userId}','${now}')`);
      set.status = 201;
      return { ok: true, id };
    } catch(e: any) { set.status = 500; return { error: { message: e.message } }; }
  })


  .get("/ledger/export", ({ headers, set }: any) => {
    const auth = headers["authorization"];
    if (!auth) { set.status = 401; return { error: { message: "Auth required" } }; }
    try {
      const { execSync } = require("child_process");
      const pathLib = require("path");
      const DB = pathLib.join(process.env.HOME, "rapid-ledger", "apps", "api", "dev.db");
      function q(sql: string) {
        try { const r = execSync(`sqlite3 -json "${DB}" ${JSON.stringify(sql)}`,{stdio:"pipe"}).toString().trim(); return r?JSON.parse(r):[]; } catch { return []; }
      }
      const entries = q(`SELECT * FROM LedgerEntry ORDER BY finalizedAt DESC`);
      const rows = entries.map((e: any) => {
        const decider = q(`SELECT name,email FROM User WHERE id='${e.decideOwnerId}' LIMIT 1`);
        const performer = q(`SELECT name,email FROM User WHERE id='${e.performOwnerId}' LIMIT 1`);
        return [
          e.documentCode,
          e.title.replace(/,/g,""),
          e.finalDecision.replace(/,/g,""),
          e.riskLevel,
          e.complianceImpact?"Yes":"No",
          e.version,
          decider[0]?.name??"",
          decider[0]?.email??"",
          performer[0]?.name??"",
          performer[0]?.email??"",
          new Date(e.finalizedAt).toLocaleDateString(),
        ].join(",");
      });
      const csv = ["Code,Title,Final Decision,Risk,Compliance,Version,Decide Owner,Decide Email,Perform Owner,Perform Email,Finalized On", ...rows].join("\n");
      set.headers["Content-Type"] = "text/csv";
      set.headers["Content-Disposition"] = "attachment; filename=rapid-ledger-export.csv";
      return csv;
    } catch(e: any) { set.status = 500; return { error: { message: e.message } }; }
  })


  .get("/audit-log", ({ query, headers, set }: any) => {
    const auth = headers["authorization"];
    if (!auth) { set.status = 401; return { error: { message: "Auth required" } }; }
    try {
      const jwtLib = require("jsonwebtoken");
      jwtLib.verify(auth.slice(7), JWT_SECRET);
      const { execSync } = require("child_process");
      const pathLib = require("path");
      const DB = pathLib.join(process.env.HOME, "rapid-ledger", "apps", "api", "dev.db");

      // Optional filter by action type
      const actionFilter = query?.action ? `WHERE a.action='${String(query.action).replace(/'/g, "")}'` : "";

      const sql = `
        SELECT
          a.id, a.action, a.objectType, a.objectId, a.details, a.createdAt,
          u.name as actorName, u.email as actorEmail, u.role as actorRole,
          d.documentCode as documentCode, d.title as documentTitle
        FROM AuditLog a
        LEFT JOIN User u ON u.id = a.actorId
        LEFT JOIN RapidDocument d ON d.id = a.objectId
        ${actionFilter}
        ORDER BY a.createdAt DESC
        LIMIT 200
      `.replace(/\s+/g, " ");

      const r = execSync(`sqlite3 -json "${DB}" ${JSON.stringify(sql)}`, { stdio: "pipe" }).toString().trim();
      const entries = r ? JSON.parse(r) : [];
      return entries;
    } catch (e: any) {
      console.error("audit-log error:", e.message);
      set.status = 500;
      return { error: { message: "Failed to fetch audit log" } };
    }
  })


.post("/documents/:id/version", ({ params, headers, set }: any) => {
    const auth = headers["authorization"];
    if (!auth) { set.status = 401; return { error: { message: "Auth required" } }; }
    try {
      const jwtLib = require("jsonwebtoken");
      const payload = jwtLib.verify(auth.slice(7), JWT_SECRET) as any;
      const { execSync } = require("child_process");
      const pathLib = require("path");
      const DB = pathLib.join(process.env.HOME, "rapid-ledger", "apps", "api", "dev.db");
      function q(sql: string) {
        try { const r = execSync(`sqlite3 -json "${DB}" ${JSON.stringify(sql)}`,{stdio:"pipe"}).toString().trim(); return r?JSON.parse(r):[]; } catch { return []; }
      }
      function run(sql: string) { try { execSync(`sqlite3 "${DB}" ${JSON.stringify(sql)}`,{stdio:"pipe"}); } catch(e:any){console.error(e.message);} }

      const docs = q(`SELECT * FROM RapidDocument WHERE id='${params.id}' LIMIT 1`);
      if (!docs.length) { set.status = 404; return { error: { message: "Document not found" } }; }
      const doc = docs[0];

      if (doc.status !== "finalized" && doc.status !== "execution_complete") {
        set.status = 422;
        return { error: { message: `Only finalized documents can be versioned. Current status: ${doc.status}` } };
      }

      // Check user is the Decide owner of this document or an admin
      const decideRole = q(`SELECT userId FROM RapidRoleAssignment WHERE documentId='${params.id}' AND roleType='decide' LIMIT 1`);
      const me = q(`SELECT role FROM User WHERE id='${payload.userId}' LIMIT 1`)[0];
      const isDecider = decideRole.length && decideRole[0].userId === payload.userId;
      const isAdmin = me && me.role === "admin";
      if (!isDecider && !isAdmin) {
        set.status = 403;
        return { error: { message: "Only the Decide owner or Admin can create a new version" } };
      }

      // Count existing versions of this documentCode to determine next version number
      const versions = q(`SELECT MAX(version) as maxV FROM RapidDocument WHERE documentCode='${doc.documentCode}'`);
      const nextVersion = (versions[0]?.maxV ?? doc.version) + 1;

      // Create new draft doc as v2 (or v3, etc.), linked to original via parentDocumentId
      const newId = `cmp${Math.random().toString(36).slice(2, 14)}`;
      const now = new Date().toISOString();
      const esc = (s: string) => String(s ?? "").replace(/'/g, "''");

      run(`INSERT INTO RapidDocument (id,documentCode,title,decisionSummary,businessContext,problemStatement,proposedDecision,alternativesConsidered,riskLevel,complianceImpact,department,deadline,status,version,parentDocumentId,createdBy,createdAt,updatedAt) VALUES ('${newId}','${doc.documentCode}','${esc(doc.title)}','${esc(doc.decisionSummary)}','${esc(doc.businessContext)}','${esc(doc.problemStatement)}','${esc(doc.proposedDecision)}','${esc(doc.alternativesConsidered)}','${doc.riskLevel}',${doc.complianceImpact},'${doc.department}','${doc.deadline}','draft',${nextVersion},'${params.id}','${payload.userId}','${now}','${now}')`);

      // Copy role assignments to the new version
      const roles = q(`SELECT roleType, userId FROM RapidRoleAssignment WHERE documentId='${params.id}'`);
      for (const r of roles) {
        const raId = `cmp${Math.random().toString(36).slice(2, 14)}`;
        run(`INSERT INTO RapidRoleAssignment (id,documentId,roleType,userId,createdAt) VALUES ('${raId}','${newId}','${r.roleType}','${r.userId}','${now}')`);
      }

      // Copy evidence to new version
      const evidences = q(`SELECT type,title,urlOrPath,description,uploadedBy FROM Evidence WHERE documentId='${params.id}'`);
      for (const ev of evidences) {
        const evId = `cmp${Math.random().toString(36).slice(2, 14)}`;
        run(`INSERT INTO Evidence (id,documentId,type,title,urlOrPath,description,uploadedBy,createdAt) VALUES ('${evId}','${newId}','${ev.type}','${esc(ev.title)}','${esc(ev.urlOrPath ?? "")}','${esc(ev.description ?? "")}','${ev.uploadedBy}','${now}')`);
      }

      // Fix createdBy — should be original document creator, not the decider
      run(`UPDATE RapidDocument SET createdBy='${doc.createdBy}' WHERE id='${newId}'`);

      // Audit
      const auditId = `cmp${Math.random().toString(36).slice(2, 14)}`;
      run(`INSERT INTO AuditLog (id,actorId,action,objectType,objectId,details,createdAt) VALUES ('${auditId}','${payload.userId}','version_created','RapidDocument','${newId}','{"documentCode":"${doc.documentCode}","fromVersion":${doc.version},"toVersion":${nextVersion}}','${now}')`);

      return { id: newId, documentCode: doc.documentCode, version: nextVersion, status: "draft", parentDocumentId: params.id };
    } catch (e: any) {
      console.error("version error:", e.message);
      set.status = 500;
      return { error: { message: "Failed to create version" } };
    }
  })
.post("/documents/:id/execution-complete", async ({ params, body, headers, set }: any) => {
    const auth = headers["authorization"];
    if (!auth) { set.status = 401; return { error: { message: "Auth required" } }; }
    try {
      const jwtLib = require("jsonwebtoken");
      const payload = jwtLib.verify(auth.slice(7), JWT_SECRET) as any;
      const { execSync } = require("child_process");
      const pathLib = require("path");
      const DB = pathLib.join(process.env.HOME, "rapid-ledger", "apps", "api", "dev.db");
      function q(sql: string) {
        try { const r = execSync(`sqlite3 -json "${DB}" ${JSON.stringify(sql)}`,{stdio:"pipe"}).toString().trim(); return r?JSON.parse(r):[]; } catch { return []; }
      }
      function run(sql: string) { try { execSync(`sqlite3 "${DB}" ${JSON.stringify(sql)}`,{stdio:"pipe"}); } catch(e:any){console.error(e.message);} }

      const notes = (body?.notes ?? "").trim();
      if (!notes) { set.status = 400; return { error: { message: "Execution notes are required" } }; }

      const docs = q(`SELECT * FROM RapidDocument WHERE id='${params.id}' LIMIT 1`);
      if (!docs.length) { set.status = 404; return { error: { message: "Document not found" } }; }
      const doc = docs[0];

      if (doc.status !== "finalized") {
        set.status = 422;
        return { error: { message: `Document must be finalized to mark execution complete. Current status: ${doc.status}` } };
      }

      // Must be Perform owner or admin
      const performRole = q(`SELECT userId FROM RapidRoleAssignment WHERE documentId='${params.id}' AND roleType='perform' LIMIT 1`);
      const me = q(`SELECT role FROM User WHERE id='${payload.userId}' LIMIT 1`)[0];
      const isPerformer = performRole.length && performRole[0].userId === payload.userId;
      const isAdmin = me && me.role === "admin";
      if (!isPerformer && !isAdmin) {
        set.status = 403;
        return { error: { message: "Only the Perform owner or Admin can mark execution complete" } };
      }

      const now = new Date().toISOString();
      const escNotes = notes.replace(/'/g, "''");

      run(`UPDATE RapidDocument SET status='execution_complete', updatedAt='${now}' WHERE id='${params.id}'`);

      // Audit
      const auditId = `cmp${Math.random().toString(36).slice(2, 14)}`;
      run(`INSERT INTO AuditLog (id,actorId,action,objectType,objectId,details,createdAt) VALUES ('${auditId}','${payload.userId}','execution_completed','RapidDocument','${params.id}','{"documentCode":"${doc.documentCode}","notes":"${escNotes}"}','${now}')`);

      return { id: params.id, status: "execution_complete", notes };
    } catch (e: any) {
      console.error("execution-complete error:", e.message);
      set.status = 500;
      return { error: { message: "Failed to mark execution complete" } };
    }
  })
  .listen(PORT);

console.log(`RAPID Ledger API running at http://localhost:${PORT}`);
