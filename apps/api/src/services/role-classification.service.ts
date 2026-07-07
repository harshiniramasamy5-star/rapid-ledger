import { prisma } from "../lib/prisma";

const GROQ_API_KEY = process.env.GROQ_API_KEY ?? "";
const VALID_ROLES = ["recommend", "agree", "perform", "input", "decide", "review", "acknowledge", "inform"];

interface CandidateProfile {
  userId: string;
  name: string;
  email: string;
  department: string | null;
  role: string;
  history: Record<string, number>; // roleType -> count of past assignments
}

export interface RoleSuggestion {
  userId: string;
  name: string;
  email: string;
  suggestedRole: string;
  rationale: string;
}

/**
 * Builds candidate profiles for every member of the document's workspace,
 * including their department and a count of past RAPID role assignments
 * (used as a lightweight signal of "historical actions" per the spec).
 */
async function buildCandidateProfiles(orgId: string): Promise<CandidateProfile[]> {
  const members = await prisma.workspaceMember.findMany({
    where: { orgId },
    include: { user: { select: { id: true, name: true, email: true, department: true, role: true } } },
  });

  const profiles: CandidateProfile[] = [];
  for (const m of members) {
    const history = await prisma.roleAssignment.groupBy({
      by: ["roleType"],
      where: { userId: m.user.id },
      _count: true,
    });
    const historyMap: Record<string, number> = {};
    for (const h of history) historyMap[h.roleType] = h._count;
    profiles.push({
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      department: m.user.department,
      role: m.user.role,
      history: historyMap,
    });
  }
  return profiles;
}

/**
 * AI-classifies RAPID roles for a document based on candidate emails, titles,
 * departments, and historical role-assignment patterns. Returns suggestions
 * only — nothing is persisted. Admins review/edit via POST /documents/:id/roles.
 */
export async function suggestRolesForDocument(
  documentId: string
): Promise<{ ok: true; suggestions: RoleSuggestion[] } | { ok: false; error: string }> {
  const doc = await prisma.rapidDocument.findUnique({ where: { id: documentId } });
  if (!doc) return { ok: false, error: "Document not found" };
  if (!doc.orgId) return { ok: false, error: "Document has no workspace" };

  const candidates = await buildCandidateProfiles(doc.orgId);
  if (candidates.length === 0) return { ok: true, suggestions: [] };

  if (!GROQ_API_KEY) {
    // No key configured — fall back to a safe, transparent default rather than failing the request
    return {
      ok: true,
      suggestions: candidates.map(c => ({
        userId: c.userId, name: c.name, email: c.email,
        suggestedRole: "input",
        rationale: "AI classification unavailable (no API key configured) — defaulted to Input for manual review.",
      })),
    };
  }

  const candidateList = candidates.map(c =>
    `- ${c.name} <${c.email}> | department: ${c.department ?? "unknown"} | workspace role: ${c.role} | past assignments: ${
      Object.entries(c.history).map(([k, v]) => `${k}:${v}`).join(", ") || "none"
    }`
  ).join("\n");

  const prompt = `You are classifying participants into RAPID decision-making framework roles for a new document.

RAPID roles:
- recommend: provides expert knowledge, analysis, drives the proposal
- input: shares context, requirements, or domain expertise but doesn't decide
- agree: must sign off / approve before the decision proceeds
- decide: has final authority and ownership of the outcome
- perform: will execute or implement the decision once made
- review: reviews the document/decision for quality or compliance before it proceeds
- acknowledge: must confirm they've seen and understood the finalized decision
- inform: is notified of the decision for awareness only, no action required

Document:
Title: ${doc.title}
Summary: ${doc.decisionSummary}
Department: ${doc.department ?? "unknown"}
Business context: ${doc.businessContext ?? "none provided"}

Candidates (workspace members, with their department and history of past RAPID role assignments):
${candidateList}

Based on each candidate's department, workspace role, and past assignment history, suggest the single most likely RAPID role for each candidate for THIS document. Favor "input" when evidence is weak. Respond ONLY with a JSON object mapping email to an object {"role": "<one of recommend|input|agree|decide|perform|review|acknowledge|inform>", "rationale": "<one short sentence>"}. No other text.`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 1200,
        temperature: 0.1,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content ?? "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean) as Record<string, { role?: string; rationale?: string }>;

    const suggestions: RoleSuggestion[] = candidates.map(c => {
      const entry = parsed[c.email];
      const role = entry?.role && VALID_ROLES.includes(entry.role) ? entry.role : "input";
      return {
        userId: c.userId,
        name: c.name,
        email: c.email,
        suggestedRole: role,
        rationale: entry?.rationale ?? "No rationale provided — defaulted to Input.",
      };
    });
    return { ok: true, suggestions };
  } catch (e) {
    console.error("[RoleClassification] Groq suggestion failed:", e);
    return {
      ok: true,
      suggestions: candidates.map(c => ({
        userId: c.userId, name: c.name, email: c.email,
        suggestedRole: "input",
        rationale: "AI classification failed — defaulted to Input for manual review.",
      })),
    };
  }
}
