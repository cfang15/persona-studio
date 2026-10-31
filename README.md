# Persona Studio

Write a personality for a game character, talk to it, and measure whether it stays in character.

I built this because when I fine-tuned NPC dialogue models, the hardest part wasn't training. It was checking whether a character answered the same question the same way twice. Persona Studio turns that check into a tool: ask a character the same question several times and get a consistency score.

## What it does

- **Characters:** create and edit personas with traits, a speaking style and a backstory.
- **Chat:** talk to a character. Every conversation is saved, and each reply records how long the model took.
- **Stay-in-character check:** ask one question 2–10 times. The score (0–100) is 70% *agreement* (mean pairwise Jaccard similarity of the answers) plus 30% *trait coverage* (share of the persona's traits that show up). Every run is saved so you can compare before and after you edit a persona.

## Architecture

```
Next.js + React + TypeScript + Tailwind  (web, :3000)
                │  REST/JSON
                ▼
Node.js + Express + TypeScript           (api, :4000) ──► PostgreSQL (:5432)
                │  REST/JSON
                ▼
Python + FastAPI                         (model, :8000) ──► mock provider, or any
                                                            OpenAI-compatible LLM server
```

- **web:** Next.js App Router frontend.
- **api:** owns all data. Validates input with Zod, stores personas, conversations, messages and consistency runs in Postgres, and calls the model service. If the model service fails, the API returns 502 and saves nothing.
- **model-service:** builds the system prompt from the persona, calls the LLM and computes consistency scores. The default `mock` provider needs no API key, so the app and CI run anywhere. Set `LLM_PROVIDER=openai` to use OpenAI, Ollama, vLLM, LM Studio, or a LoRA fine-tune served behind an OpenAI-compatible endpoint.

## Run it

With Docker:

```bash
cp .env.example .env     # optional: add a real LLM
docker compose up --build
```

Open http://localhost:3000.

Without Docker, you need Postgres running locally. Then start each service:

```bash
# model service
cd model-service && pip install -r requirements-dev.txt && uvicorn app.main:app --port 8000

# api (creates its tables on start)
cd api && npm install && DATABASE_URL=postgres://user:pass@localhost:5432/persona_studio npm run dev

# web
cd web && npm install && npm run dev
```

## Tests and CI

```bash
cd model-service && pytest          # endpoints, scoring math, prompt building
cd api && npm test                  # every route, run against real SQL in an in-memory Postgres (pg-mem)
cd web && npm run build             # type-check and production build
```

GitHub Actions runs all three on every push and pull request, applies the migrations to a real Postgres 17 service container, then builds every Docker image.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET, POST | `/personas` | List or create characters |
| GET, PUT, DELETE | `/personas/:id` | Read, update or delete a character (deletes its chats and runs) |
| GET, POST | `/personas/:id/conversations` | List or start conversations |
| GET | `/conversations/:id` | A conversation with its messages |
| POST | `/conversations/:id/messages` | Send a message and get the character's reply |
| GET, POST | `/personas/:id/consistency-runs` | List or run stay-in-character checks |

## Deploying

The repo deploys as-is to any host that runs Docker Compose (a $5 VPS works). For managed hosting, deploy `web` to Vercel, `api` and `model-service` to Render or Fly.io, and use a managed Postgres such as Neon or Supabase. Set `NEXT_PUBLIC_API_URL` at web build time and `CORS_ORIGIN` on the API to the web URL.
