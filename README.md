# Interactive Podcast Tutor

Audio-first GenAI learning app: upload a PDF, get a two-host podcast, pause and ask grounded questions, revise with quizzes.

Full spec → [PROJECT.md](PROJECT.md)

## Stack

- **Backend:** NestJS (`apps/api`)
- **Frontend:** React + Vite (`apps/web`)
- **Infra:** Postgres + Redis + Qdrant (Docker Compose)
- **AI:** OpenAI (LLM + embeddings + TTS)

## Quick start

```bash
# 1. Copy env and (later) fill in OPENAI_API_KEY
cp .env.example .env

# 2. Install
pnpm install

# 3. Start infra (Postgres + Redis + Qdrant)
pnpm infra:up

# 4. Run API + Web in two terminals
pnpm dev:api    # → http://localhost:3001
pnpm dev:web    # → http://localhost:5173
```

## Port map

| Service | Host port | Container port | Notes |
|---|---|---|---|
| API (NestJS) | 3001 | — | |
| Web (Vite) | 5173 | — | |
| Postgres | 5432 | 5432 | |
| Redis | 6379 | 6379 | |
| Qdrant HTTP | **7333** | 6333 | remapped — 6333 is in use by another project on this machine |
| Qdrant gRPC | **7334** | 6334 | remapped — see above |

## Verify

```bash
curl http://localhost:3001/health
# {"status":"ok","service":"apt-api","time":"..."}
```

Open <http://localhost:5173> — the header should show `API: ok`.

## Where we are

Phase 1 (scaffold) — done. Next: Phase 2 (upload + extract).
