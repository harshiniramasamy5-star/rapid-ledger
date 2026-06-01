"use client";

import { useState, useRef, useEffect } from "react";

type Message = { role: "user" | "assistant"; content: string };

export default function ChatCLPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      const reply = data.reply ?? "Sorry, something went wrong.";
      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Error: could not reach the AI service." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">ChatCL</h1>

      <div className="flex-1 overflow-y-auto space-y-3 border rounded-lg p-4 bg-muted/20">
        {messages.length === 0 && (
          <p className="text-muted-foreground text-sm">Ask anything about your decisions, documents, or audit logs.</p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`rounded-lg px-4 py-2 max-w-[80%] text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background border"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-lg px-4 py-2 bg-background border text-sm text-muted-foreground">
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 mt-4">
        <input
          className="flex-1 border rounded-lg px-3 py-2 text-sm bg-background"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          disabled={loading}
        />
        <button
          className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
          onClick={send}
          disabled={loading}
        >
          Send
        </button>
      </div>
    </div>
  );
}
