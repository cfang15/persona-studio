import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { ZodError } from "zod";
import { ModelServiceError, type ModelClient } from "./modelClient.js";
import type { Repo } from "./repo.js";
import { consistencyInput, conversationInput, messageInput, personaInput } from "./types.js";

class NotFound extends Error {}

const idParam = (req: Request, name = "id"): number => {
  const id = Number(req.params[name]);
  if (!Number.isInteger(id) || id <= 0) throw new NotFound();
  return id;
};

export function createApp(repo: Repo, model: ModelClient, corsOrigin = "*") {
  const app = express();
  app.use(cors({ origin: corsOrigin }));
  app.use(express.json({ limit: "100kb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // ---- Personas ----
  app.get("/personas", async (_req, res) => {
    res.json(await repo.listPersonas());
  });

  app.post("/personas", async (req, res) => {
    res.status(201).json(await repo.createPersona(personaInput.parse(req.body)));
  });

  app.get("/personas/:id", async (req, res) => {
    const persona = await repo.getPersona(idParam(req));
    if (!persona) throw new NotFound();
    res.json(persona);
  });

  app.put("/personas/:id", async (req, res) => {
    const persona = await repo.updatePersona(idParam(req), personaInput.parse(req.body));
    if (!persona) throw new NotFound();
    res.json(persona);
  });

  app.delete("/personas/:id", async (req, res) => {
    if (!(await repo.deletePersona(idParam(req)))) throw new NotFound();
    res.status(204).end();
  });

  // ---- Conversations ----
  app.get("/personas/:id/conversations", async (req, res) => {
    const personaId = idParam(req);
    if (!(await repo.getPersona(personaId))) throw new NotFound();
    res.json(await repo.listConversations(personaId));
  });

  app.post("/personas/:id/conversations", async (req, res) => {
    const personaId = idParam(req);
    if (!(await repo.getPersona(personaId))) throw new NotFound();
    const { title } = conversationInput.parse(req.body ?? {});
    const convo = await repo.createConversation(personaId, title ?? `Chat ${new Date().toLocaleString("en-US")}`);
    res.status(201).json(convo);
  });

  app.get("/conversations/:id", async (req, res) => {
    const convo = await repo.getConversation(idParam(req));
    if (!convo) throw new NotFound();
    res.json({ ...convo, messages: await repo.listMessages(convo.id) });
  });

  /** Save the user's message, ask the model service for the persona's reply, save that too. */
  app.post("/conversations/:id/messages", async (req, res) => {
    const convo = await repo.getConversation(idParam(req));
    if (!convo) throw new NotFound();
    const { content } = messageInput.parse(req.body);
    const persona = (await repo.getPersona(convo.personaId))!;
    const history = await repo.listMessages(convo.id);

    const result = await model.generate(persona, history, content);
    const userMessage = await repo.addMessage(convo.id, "user", content);
    const reply = await repo.addMessage(convo.id, "assistant", result.reply, result.latencyMs);
    res.status(201).json({ userMessage, reply });
  });

  // ---- Consistency runs ----
  app.get("/personas/:id/consistency-runs", async (req, res) => {
    const personaId = idParam(req);
    if (!(await repo.getPersona(personaId))) throw new NotFound();
    res.json(await repo.listRuns(personaId));
  });

  app.post("/personas/:id/consistency-runs", async (req, res) => {
    const persona = await repo.getPersona(idParam(req));
    if (!persona) throw new NotFound();
    const { probe, samples } = consistencyInput.parse(req.body);
    const result = await model.consistency(persona, probe, samples);
    const run = await repo.addRun({ personaId: persona.id, probe, ...result });
    res.status(201).json(run);
  });

  // ---- Errors ----
  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof NotFound) return res.status(404).json({ error: "Not found" });
    if (err instanceof ZodError) return res.status(400).json({ error: "Invalid request", issues: err.issues });
    if (err instanceof ModelServiceError) return res.status(502).json({ error: err.message });
    if (err instanceof SyntaxError) return res.status(400).json({ error: "Malformed JSON" });
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
