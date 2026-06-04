import { Elysia } from "elysia";

export const aiRoutes = new Elysia()
  .post("/ai/chat", async ({ body, set }) => {
    const { messages } = body as { messages: { role: string; content: string }[] };
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      set.status = 500;
      return { error: { code: "MISSING_KEY", message: "GROQ_API_KEY not set" } };
    }
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages })
    });
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
    if (!data?.choices?.[0]?.message?.content) {
      set.status = 500;
      return { error: { code: "GROQ_ERROR", raw: data } };
    }
    return { reply: data.choices[0].message.content };
  });
