import type { Message, Persona } from "./types.js";

export interface GenerateResult {
  reply: string;
  latencyMs: number;
}

export interface ConsistencyResult {
  responses: string[];
  agreement: number;
  traitCoverage: number;
  score: number;
}

export interface ModelClient {
  generate(persona: Persona, history: Message[], message: string): Promise<GenerateResult>;
  consistency(persona: Persona, probe: string, samples: number): Promise<ConsistencyResult>;
}

export class ModelServiceError extends Error {}

const toWirePersona = (p: Persona) => ({
  name: p.name,
  traits: p.traits,
  speaking_style: p.speakingStyle,
  backstory: p.backstory,
});

/** HTTP client for the FastAPI model service. */
export class HttpModelClient implements ModelClient {
  constructor(private baseUrl: string, private timeoutMs = 30_000) {}

  private async post<T>(path: string, body: unknown): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      throw new ModelServiceError(`Model service unreachable: ${(err as Error).message}`);
    }
    if (!res.ok) {
      throw new ModelServiceError(`Model service returned ${res.status}: ${await res.text()}`);
    }
    return (await res.json()) as T;
  }

  async generate(persona: Persona, history: Message[], message: string): Promise<GenerateResult> {
    const data = await this.post<{ reply: string; latency_ms: number }>("/generate", {
      persona: toWirePersona(persona),
      history: history.slice(-20).map((m) => ({ role: m.role, content: m.content })),
      message,
    });
    return { reply: data.reply, latencyMs: data.latency_ms };
  }

  async consistency(persona: Persona, probe: string, samples: number): Promise<ConsistencyResult> {
    const data = await this.post<{
      responses: string[];
      agreement: number;
      trait_coverage: number;
      score: number;
    }>("/consistency", { persona: toWirePersona(persona), probe, samples });
    return {
      responses: data.responses,
      agreement: data.agreement,
      traitCoverage: data.trait_coverage,
      score: data.score,
    };
  }
}
