import { Elysia } from "elysia";

const SYSTEM_PROMPT = `You are ChatCL, the AI assistant inside RAPID Ledger — a decision governance platform built on the RAPID framework (Recommend, Agree, Perform, Input, Decide).

You help users understand:
- The RAPID decision workflow: documents move through Draft → Submitted → Approved → Finalized, creating a permanent ledger entry.
- Roles: Admin (decider, full access), Creator, Recommender, Approver (agree role for high-risk decisions), Performer (execution), Viewer (input provider).
- Features: role-based access control, multi-stage approval, immutable audit logs, versioning, and the decision ledger.

Answer concisely and helpfully. If asked about decisions, documents, approvals, or audit logs, frame answers in the context of RAPID Ledger.`;

export const aiRoutes = new Elysia()
  .post("/ai/chat", async ({ body, set }) => {
    const { messages } = body as { messages: { role: string; content: string }[] };
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      set.status = 500;
      return { error: { code: "MISSING_KEY", message: "GROQ_API_KEY not set in .env" } };
    }
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages]
      })
    });
    const data = await response.json() as any;
    if (!data?.choices?.[0]?.message?.content) {
      set.status = 500;
      return { error: { code: "GROQ_ERROR", raw: data } };
    }
    return { reply: data.choices[0].message.content };
  });
