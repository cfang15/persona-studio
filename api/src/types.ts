import { z } from "zod";

export const personaInput = z.object({
  name: z.string().trim().min(1).max(80),
  traits: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  speakingStyle: z.string().max(400).default(""),
  backstory: z.string().max(2000).default(""),
});
export type PersonaInput = z.infer<typeof personaInput>;

export const messageInput = z.object({
  content: z.string().trim().min(1).max(4000),
});

export const conversationInput = z.object({
  title: z.string().trim().min(1).max(120).optional(),
});

export const consistencyInput = z.object({
  probe: z.string().trim().min(1).max(1000),
  samples: z.number().int().min(2).max(10).default(5),
});

export interface Persona extends PersonaInput {
  id: number;
  createdAt: string;
}

export interface Conversation {
  id: number;
  personaId: number;
  title: string;
  createdAt: string;
}

export interface Message {
  id: number;
  conversationId: number;
  role: "user" | "assistant";
  content: string;
  latencyMs: number | null;
  createdAt: string;
}

export interface ConsistencyRun {
  id: number;
  personaId: number;
  probe: string;
  score: number;
  agreement: number;
  traitCoverage: number;
  responses: string[];
  createdAt: string;
}
