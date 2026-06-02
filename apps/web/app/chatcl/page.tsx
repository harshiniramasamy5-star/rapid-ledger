"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { api } from "@/lib/api";

type Message = { role: "user" | "assistant"; content: string };

export default function ChatCLPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Detect a document code like DOC-001 or DEMO-001 in the user's message
  const findDocCode = (text: string): string | null => {
    const match = text.match(/\b([A-Z]{2,}-\d{2,})\b/);
    return match ? match[1] : null;
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    // If the user references a document code, fetch its real data
    let context = "";
    const code = findDocCode(text);
    if (code) {
      try {
        const docs = await api.get<{ data?: Record<string, unknown>[] } | Record<string, unknown>[]>(`/documents?search=${code}`);
        const list = Array.isArray(docs) ? docs : docs?.data ?? [];
        const doc = list.find((d: Record<string, unknown>) => d.documentCode === code) ?? list[0];
        if (doc) {
          context = `\n\n[Real document data for ${code}]:\n${JSON.stringify(doc, null, 2)}`;
        }
      } catch {
        // ignore fetch errors, fall back to general answer
      }
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...newMessages.slice(0, -1),
            { role: "user", content: text + context },
          ],
        }),
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
    <div className="flex flex-col h-[calc(100vh-7rem)] max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-1">ChatCL</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Ask about RAPID, or reference a document by code (e.g. &quot;Tell me about DEMO-001&quot;) for real data.
      </p>

      <div className="flex-1 overflow-y-auto space-y-3 border rounded-lg p-4 bg-muted/20">
        {messages.length === 0 && (
          <p className="text-muted-foreground text-sm">Ask anything about your decisions, documents, or audit logs.</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`rounded-lg px-4 py-2 max-w-[80%] text-sm ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background border prose prose-sm max-w-none dark:prose-invert"
              }`}
            >
              {m.role === "assistant" ? <ReactMarkdown>{m.content}</ReactMarkdown> : m.content}
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
