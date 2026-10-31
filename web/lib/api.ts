export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface Persona {
  id: number;
  name: string;
  traits: string[];
  speakingStyle: string;
  backstory: string;
  createdAt: string;
}

export type PersonaInput = Omit<Persona, "id" | "createdAt">;

export interface Conversation {
  id: number;
  personaId: number;
  title: string;
  createdAt: string;
}

export interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  latencyMs: number | null;
  createdAt: string;
}

export interface ConsistencyRun {
  id: number;
  probe: string;
  score: number;
  agreement: number;
  traitCoverage: number;
  responses: string[];
  createdAt: string;
}

export class ApiError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError(`Can't reach the API at ${API_URL}. Check that it's running.`);
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.error ?? `Request failed with status ${res.status}`);
  return body as T;
}

export const api = {
  listPersonas: () => request<Persona[]>("/personas"),
  getPersona: (id: number) => request<Persona>(`/personas/${id}`),
  createPersona: (p: PersonaInput) =>
    request<Persona>("/personas", { method: "POST", body: JSON.stringify(p) }),
  updatePersona: (id: number, p: PersonaInput) =>
    request<Persona>(`/personas/${id}`, { method: "PUT", body: JSON.stringify(p) }),
  deletePersona: (id: number) => request<void>(`/personas/${id}`, { method: "DELETE" }),

  listConversations: (personaId: number) =>
    request<Conversation[]>(`/personas/${personaId}/conversations`),
  createConversation: (personaId: number) =>
    request<Conversation>(`/personas/${personaId}/conversations`, { method: "POST", body: "{}" }),
  getConversation: (id: number) =>
    request<Conversation & { messages: Message[] }>(`/conversations/${id}`),
  sendMessage: (conversationId: number, content: string) =>
    request<{ userMessage: Message; reply: Message }>(`/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),

  listRuns: (personaId: number) => request<ConsistencyRun[]>(`/personas/${personaId}/consistency-runs`),
  runConsistency: (personaId: number, probe: string, samples: number) =>
    request<ConsistencyRun>(`/personas/${personaId}/consistency-runs`, {
      method: "POST",
      body: JSON.stringify({ probe, samples }),
    }),
};
