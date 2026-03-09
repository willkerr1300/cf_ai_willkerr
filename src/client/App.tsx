import { useRef, useEffect, FormEvent } from "react";
import { useAgent } from "agents/react";
import { useAgentChat } from "agents/ai-react";

function renderContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part: { type: string; text?: string }) =>
        part.type === "text" ? (part.text ?? "") : ""
      )
      .join("");
  }
  return String(content ?? "");
}

export default function App() {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const agent = useAgent({ agent: "ResearchAgent", name: "default" });

  const { messages, input, setInput, handleSubmit, status } = useAgentChat({
    agent,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    handleSubmit(e);
  };

  const isLoading = status === "streaming" || status === "submitted";

  const suggestions = [
    "Research the history and future of quantum computing",
    "Research recent advances in renewable energy",
    "Research the impact of AI on software engineering",
  ];

  return (
    <div className="app">
      <header className="header">
        <h1>CF AI Research Agent</h1>
        <p>Llama 3.3 � Workers AI � Durable Objects � Cloudflare Workflows</p>
      </header>

      <main className="chat-container">
        {messages.length === 0 && (
          <div className="welcome">
            <h2>AI Research Assistant</h2>
            <p>
              Ask me anything, or have me research a topic in depth using a
              multi-step Cloudflare Workflow. I remember your name and past
              research across sessions.
            </p>
            <div className="suggestions">
              {suggestions.map((s) => (
                <button key={s} onClick={() => setInput(s)}>
                  {s}
                </button>
              ))}
              <button onClick={() => setInput("What topics have I researched?")}>
                Show my research history
              </button>
            </div>
          </div>
        )}

        <div className="messages">
          {messages.map((msg) => {
            const text = renderContent(msg.content);
            if (!text) return null;
            return (
              <div key={msg.id} className={`message ${msg.role}`}>
                <div className="message-content">
                  {msg.role === "assistant" && (
                    <span className="avatar">AI</span>
                  )}
                  <div className="text">{text}</div>
                  {msg.role === "user" && <span className="avatar">You</span>}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="message assistant">
              <div className="message-content">
                <span className="avatar">AI</span>
                <div className="text loading">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      <form onSubmit={onSubmit} className="input-form">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Chat or say 'research [topic]'..."
          disabled={isLoading}
          autoFocus
        />
        <button type="submit" disabled={isLoading || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
