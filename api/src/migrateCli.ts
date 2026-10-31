import pg from "pg";
import { migrate } from "./migrate.js";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? "postgres://persona:persona@localhost:5432/persona_studio",
});

migrate(pool)
  .then((files) => console.log(`Applied migrations: ${files.join(", ")}`))
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
