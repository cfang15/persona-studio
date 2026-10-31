"use client";

import { useEffect, useRef, useState } from "react";
import { api, type Conversation, type Message, type Persona } from "@/lib/api";

/** Chat laid out like a game script: speaker name, then the line. */
export function Chat({ persona }: { persona: Persona }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .listConversations(persona.id)
      .then((list) => {
        setConversations(list);
        if (list[0]) setActiveId(list[0].id);
      })
      .catch((e) => setError(e.message));
  }, [persona.id]);

  useEffect(() => {
    if (activeId == null) return setMessages([]);
    api.getConversation(activeId).then((c) => setMessages(c.messages)).catch((e) => setError(e.message));
  }, [activeId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);

  async function newConversation() {
    const convo = await api.createConversation(persona.id);
    setConversations((c) => [convo, ...c]);
    setActiveId(convo.id);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;
    setSending(true);
    setError(null);
    try {
      let id = activeId;
      if (id == null) {
        const convo = await api.createConversation(persona.id);
        setConversations((c) => [convo, ...c]);
        setActiveId(convo.id);
        id = convo.id;
      }
      const { userMessage, reply } = await api.sendMessage(id, content);
      setMessages((m) => [...m, userMessage, reply]);
      setDraft("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <section aria-labelledby="chat-heading" className="flex min-h-[32rem] flex-col rounded-lg border border-line bg-sheet">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
        <h2 id="chat-heading" className="font-display text-xl font-bold">Talk to {persona.name}</h2>
        <select
          aria-label="Conversation"
          value={activeId ?? ""}
          onChange={(e) => setActiveId(Number(e.target.value))}
          disabled={conversations.length === 0}
          className="ml-auto max-w-48 rounded-md border border-line bg-white px-2 py-1 text-sm"
        >
          {conversations.length === 0 && <option value="">No chats yet</option>}
          {conversations.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
        <button onClick={newConversation} className="rounded-md border border-line px-3 py-1 text-sm">
          New chat
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5" aria-live="polite">
        {messages.length === 0 && (
          <p className="text-muted">Say something to {persona.name} to start the scene.</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className="grid gap-x-4 sm:grid-cols-[7rem_1fr]">
            <p className={`font-display font-bold sm:text-right ${m.role === "assistant" ? "text-voice" : "text-muted"}`}>
              {m.role === "assistant" ? persona.name : "You"}
            </p>
            <div>
              <p className="max-w-prose leading-relaxed">{m.content}</p>
              {m.latencyMs != null && <p className="mt-1 text-xs text-muted">{m.latencyMs} ms</p>}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="flex gap-2 border-t border-line p-3">
        <label htmlFor="draft" className="sr-only">Your line</label>
        <input
          id="draft"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`What do you say to ${persona.name}?`}
          className="flex-1 rounded-md border border-line bg-white px-3 py-2"
          maxLength={4000}
        />
        <button type="submit" disabled={sending || !draft.trim()} className="rounded-md bg-voice px-4 py-2 font-bold text-white disabled:opacity-50">
          {sending ? "Sending…" : "Send"}
        </button>
      </form>
      {error && <p role="alert" className="px-4 pb-3 text-sm text-danger">{error}</p>}
    </section>
  );
}
