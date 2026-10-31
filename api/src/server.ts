import pg from "pg";
import { createApp } from "./app.js";
import { migrate } from "./migrate.js";
import { HttpModelClient } from "./modelClient.js";
import { Repo } from "./repo.js";

const PORT = Number(process.env.PORT ?? 4000);
const DATABASE_URL = process.env.DATABASE_URL ?? "postgres://persona:persona@localhost:5432/persona_studio";
// Render passes service addresses as "host:port", so a missing scheme defaults to http.
const withScheme = (url: string) => (/^https?:\/\//.test(url) ? url : `http://${url}`);
const MODEL_SERVICE_URL = withScheme(process.env.MODEL_SERVICE_URL ?? "http://localhost:8000");
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:3000";
// Free hosting tiers sleep idle services; allow time for the model service to wake up.
const MODEL_TIMEOUT_MS = Number(process.env.MODEL_TIMEOUT_MS ?? 75_000);

async function main() {
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const applied = await migrate(pool);
  console.log(`Applied migrations: ${applied.join(", ")}`);

  const app = createApp(new Repo(pool), new HttpModelClient(MODEL_SERVICE_URL, MODEL_TIMEOUT_MS), CORS_ORIGIN);
  const server = app.listen(PORT, () => console.log(`API listening on :${PORT}`));

  const shutdown = () => server.close(() => pool.end().then(() => process.exit(0)));
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
