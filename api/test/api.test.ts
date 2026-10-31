import { newDb } from "pg-mem";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { migrate } from "../src/migrate.js";
import { ModelServiceError, type ModelClient } from "../src/modelClient.js";
import { Repo } from "../src/repo.js";

/** Fake model service: echoes the message and records what the API sent it. */
class FakeModel implements ModelClient {
  lastHistoryLength = -1;
  fail = false;

  async generate(persona: { name: string }, history: unknown[], message: string) {
    if (this.fail) throw new ModelServiceError("Model service unreachable");
    this.lastHistoryLength = history.length;
    return { reply: `${persona.name} says: ${message}`, latencyMs: 12 };
  }

  async consistency(_persona: unknown, probe: string, samples: number) {
    return {
      responses: Array.from({ length: samples }, () => `answer to ${probe}`),
      agreement: 1,
      traitCoverage: 0.5,
      score: 85,
    };
  }
}

const persona = {
  name: "Grumble",
  traits: ["grumpy", "loyal"],
  speakingStyle: "Short sentences.",
  backstory: "A blacksmith.",
};

let model: FakeModel;
let app: ReturnType<typeof createApp>;

beforeEach(async () => {
  // Real SQL against an in-memory Postgres, so the migrations and queries are tested too.
  const { Pool } = newDb().adapters.createPg();
  const pool = new Pool();
  await migrate(pool);
  model = new FakeModel();
  app = createApp(new Repo(pool), model);
});

describe("personas", () => {
  it("creates, reads, updates and deletes a persona", async () => {
    const created = await request(app).post("/personas").send(persona).expect(201);
    expect(created.body).toMatchObject({ ...persona, id: expect.any(Number) });

    const id = created.body.id;
    await request(app).get(`/personas/${id}`).expect(200);

    const updated = await request(app)
      .put(`/personas/${id}`)
      .send({ ...persona, traits: ["cheerful"] })
      .expect(200);
    expect(updated.body.traits).toEqual(["cheerful"]);

    const list = await request(app).get("/personas").expect(200);
    expect(list.body).toHaveLength(1);

    await request(app).delete(`/personas/${id}`).expect(204);
    await request(app).get(`/personas/${id}`).expect(404);
  });

  it("rejects invalid personas", async () => {
    const res = await request(app).post("/personas").send({ name: "" }).expect(400);
    expect(res.body.error).toBe("Invalid request");
  });

  it("returns 404 for bad ids", async () => {
    await request(app).get("/personas/abc").expect(404);
    await request(app).get("/personas/999").expect(404);
  });
});

describe("conversations", () => {
  it("saves both sides of a chat and sends history to the model", async () => {
    const { body: p } = await request(app).post("/personas").send(persona).expect(201);
    const { body: convo } = await request(app)
      .post(`/personas/${p.id}/conversations`)
      .send({ title: "First chat" })
      .expect(201);

    const first = await request(app)
      .post(`/conversations/${convo.id}/messages`)
      .send({ content: "Hello there" })
      .expect(201);
    expect(first.body.reply.content).toBe("Grumble says: Hello there");
    expect(first.body.reply.latencyMs).toBe(12);
    expect(model.lastHistoryLength).toBe(0);

    await request(app).post(`/conversations/${convo.id}/messages`).send({ content: "Again" }).expect(201);
    expect(model.lastHistoryLength).toBe(2);

    const full = await request(app).get(`/conversations/${convo.id}`).expect(200);
    expect(full.body.messages.map((m: { role: string }) => m.role)).toEqual([
      "user",
      "assistant",
      "user",
      "assistant",
    ]);
  });

  it("returns 502 and saves nothing when the model service fails", async () => {
    const { body: p } = await request(app).post("/personas").send(persona).expect(201);
    const { body: convo } = await request(app).post(`/personas/${p.id}/conversations`).send({}).expect(201);

    model.fail = true;
    await request(app).post(`/conversations/${convo.id}/messages`).send({ content: "Hi" }).expect(502);

    const full = await request(app).get(`/conversations/${convo.id}`).expect(200);
    expect(full.body.messages).toHaveLength(0);
  });

  it("deletes conversations with their persona", async () => {
    const { body: p } = await request(app).post("/personas").send(persona).expect(201);
    const { body: convo } = await request(app).post(`/personas/${p.id}/conversations`).send({}).expect(201);
    await request(app).delete(`/personas/${p.id}`).expect(204);
    await request(app).get(`/conversations/${convo.id}`).expect(404);
  });
});

describe("consistency runs", () => {
  it("stores a scored run and lists it", async () => {
    const { body: p } = await request(app).post("/personas").send(persona).expect(201);
    const run = await request(app)
      .post(`/personas/${p.id}/consistency-runs`)
      .send({ probe: "Who are you?", samples: 3 })
      .expect(201);
    expect(run.body).toMatchObject({ score: 85, agreement: 1, traitCoverage: 0.5 });
    expect(run.body.responses).toHaveLength(3);

    const list = await request(app).get(`/personas/${p.id}/consistency-runs`).expect(200);
    expect(list.body).toHaveLength(1);
  });

  it("validates sample count", async () => {
    const { body: p } = await request(app).post("/personas").send(persona).expect(201);
    await request(app)
      .post(`/personas/${p.id}/consistency-runs`)
      .send({ probe: "Hi", samples: 100 })
      .expect(400);
  });
});
