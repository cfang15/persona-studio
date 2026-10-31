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

- **web:** Next.js App Router frontend. A route handler forwards `/api/*` to the API, so the browser only ever talks to one origin.
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

# web (API_URL defaults to http://localhost:4000)
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

`render.yaml` deploys all three services to Render's free plan, with the database on Neon's free Postgres.

1. Create a free project at [neon.com](https://neon.com) and copy its connection string.
2. In Render, choose **New → Blueprint**, pick this repo, and paste the Neon string when it asks for `DATABASE_URL`.
3. Open the `persona-studio-web` URL Render gives you.

The browser only talks to the website. It forwards `/api/*` to the API over Render's private network, so the API and model service never need public URLs or CORS. Free Render services sleep after 15 idle minutes, so the first request after a break takes about a minute.

Any host that runs Docker Compose works too (a $5 VPS is enough).
