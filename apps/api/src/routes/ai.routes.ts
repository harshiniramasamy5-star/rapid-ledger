import { Elysia } from "elysia";

export const aiRoutes = new Elysia()
  .post("/ai/chat", async ({ body, set }) => {
    const { messages } = body as { messages: { role: string; content: string }[] };
    const apiKey = process.env.MINIMAX_API_KEY;
    if (!apiKey) {
      set.status = 500;
      return { error: { code: "MISSING_KEY", message: "MINIMAX_API_KEY not set" } };
    }
    const response = await fetch("https://api.minimax.io/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ model: "MiniMax-Text-01", messages })
    });
    const data = await response.json() as any;
    console.log("MINIMAX RAW:", JSON.stringify(data));
    if (!data?.choices?.[0]?.message?.content) {
      set.status = 500;
      return { error: { code: "MINIMAX_ERROR", raw: data } };
    }
    return { reply: data.choices[0].message.content };
  });
