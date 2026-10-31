import type {
  ConsistencyRun,
  Conversation,
  Message,
  Persona,
  PersonaInput,
} from "./types.js";

/** Anything with a node-postgres style `query` method: a Pool, a Client, or pg-mem in tests. */
export interface Queryable {
  query(text: string, params?: unknown[]): Promise<{ rows: any[] }>;
}

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : String(v));
const json = <T>(v: unknown): T => (typeof v === "string" ? JSON.parse(v) : (v as T));

const toPersona = (r: any): Persona => ({
  id: r.id,
  name: r.name,
  traits: json<string[]>(r.traits),
  speakingStyle: r.speaking_style,
  backstory: r.backstory,
  createdAt: iso(r.created_at),
});

const toConversation = (r: any): Conversation => ({
  id: r.id,
  personaId: r.persona_id,
  title: r.title,
  createdAt: iso(r.created_at),
});

const toMessage = (r: any): Message => ({
  id: r.id,
  conversationId: r.conversation_id,
  role: r.role,
  content: r.content,
  latencyMs: r.latency_ms ?? null,
  createdAt: iso(r.created_at),
});

const toRun = (r: any): ConsistencyRun => ({
  id: r.id,
  personaId: r.persona_id,
  probe: r.probe,
  score: Number(r.score),
  agreement: Number(r.agreement),
  traitCoverage: Number(r.trait_coverage),
  responses: json<string[]>(r.responses),
  createdAt: iso(r.created_at),
});

export class Repo {
  constructor(private db: Queryable) {}

  async listPersonas(): Promise<Persona[]> {
    const { rows } = await this.db.query("SELECT * FROM personas ORDER BY created_at DESC, id DESC");
    return rows.map(toPersona);
  }

  async getPersona(id: number): Promise<Persona | null> {
    const { rows } = await this.db.query("SELECT * FROM personas WHERE id = $1", [id]);
    return rows[0] ? toPersona(rows[0]) : null;
  }

  async createPersona(p: PersonaInput): Promise<Persona> {
    const { rows } = await this.db.query(
      `INSERT INTO personas (name, traits, speaking_style, backstory)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [p.name, JSON.stringify(p.traits), p.speakingStyle, p.backstory],
    );
    return toPersona(rows[0]);
  }

  async updatePersona(id: number, p: PersonaInput): Promise<Persona | null> {
    const { rows } = await this.db.query(
      `UPDATE personas SET name = $2, traits = $3, speaking_style = $4, backstory = $5
       WHERE id = $1 RETURNING *`,
      [id, p.name, JSON.stringify(p.traits), p.speakingStyle, p.backstory],
    );
    return rows[0] ? toPersona(rows[0]) : null;
  }

  async deletePersona(id: number): Promise<boolean> {
    const { rows } = await this.db.query("DELETE FROM personas WHERE id = $1 RETURNING id", [id]);
    return rows.length > 0;
  }

  async listConversations(personaId: number): Promise<Conversation[]> {
    const { rows } = await this.db.query(
      "SELECT * FROM conversations WHERE persona_id = $1 ORDER BY created_at DESC, id DESC",
      [personaId],
    );
    return rows.map(toConversation);
  }

  async getConversation(id: number): Promise<Conversation | null> {
    const { rows } = await this.db.query("SELECT * FROM conversations WHERE id = $1", [id]);
    return rows[0] ? toConversation(rows[0]) : null;
  }

  async createConversation(personaId: number, title: string): Promise<Conversation> {
    const { rows } = await this.db.query(
      "INSERT INTO conversations (persona_id, title) VALUES ($1, $2) RETURNING *",
      [personaId, title],
    );
    return toConversation(rows[0]);
  }

  async listMessages(conversationId: number): Promise<Message[]> {
    const { rows } = await this.db.query(
      "SELECT * FROM messages WHERE conversation_id = $1 ORDER BY id ASC",
      [conversationId],
    );
    return rows.map(toMessage);
  }

  async addMessage(
    conversationId: number,
    role: Message["role"],
    content: string,
    latencyMs: number | null = null,
  ): Promise<Message> {
    const { rows } = await this.db.query(
      `INSERT INTO messages (conversation_id, role, content, latency_ms)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [conversationId, role, content, latencyMs],
    );
    return toMessage(rows[0]);
  }

  async listRuns(personaId: number): Promise<ConsistencyRun[]> {
    const { rows } = await this.db.query(
      "SELECT * FROM consistency_runs WHERE persona_id = $1 ORDER BY created_at DESC, id DESC",
      [personaId],
    );
    return rows.map(toRun);
  }

  async addRun(run: Omit<ConsistencyRun, "id" | "createdAt">): Promise<ConsistencyRun> {
    const { rows } = await this.db.query(
      `INSERT INTO consistency_runs (persona_id, probe, score, agreement, trait_coverage, responses)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [run.personaId, run.probe, run.score, run.agreement, run.traitCoverage, JSON.stringify(run.responses)],
    );
    return toRun(rows[0]);
  }
}
