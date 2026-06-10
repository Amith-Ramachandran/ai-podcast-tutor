# Interactive Podcast Tutor

> Audio-first GenAI learning app. Upload a PDF → get a two-host podcast → pause and ask document-grounded questions → revise with quiz/flashcards.
>
> Built as a Speechify software engineering interview showcase.

---

## 1. Vision

Most AI tools turn documents into either a summary or a chatbot. This one turns them into an **interactive audio experience**.

The differentiator over NotebookLM Audio Overviews:

> The podcast is not passive. The user can interrupt, ask questions, get grounded answers from the source document, and continue listening.

---

## 2. MVP Demo Loop (the thing that has to work)

```
Upload PDF
  ↓
Extract text
  ↓
Generate two-host podcast script (LLM)
  ↓
Generate audio (TTS, per-line, two voices)
  ↓
Play audio in the browser
  ↓
User pauses + asks question
  ↓
RAG over document chunks → grounded answer
  ↓
Resume playback
```

Everything else (quiz, flashcards, streaming, job UI polish) is additive.

---

## 3. Architecture

```
┌────────────────────────────────────────────────┐
│  Frontend (React + Vite, react-router)         │
│  - Upload page                                 │
│  - Document page                               │
│  - Podcast player + Ask panel                  │
│  - Quiz/flashcards page                        │
└──────────────┬─────────────────────────────────┘
               │ REST + SSE
               ▼
┌────────────────────────────────────────────────┐
│  Backend (NestJS)                              │
│  Modules: Documents, Podcasts, Ai, Jobs        │
│  - Upload + extract                            │
│  - Script + TTS orchestration                  │
│  - Q&A (RAG)                                   │
│  - Quiz / flashcards                           │
│  - SSE streaming for answers                   │
└──────────────┬─────────────────────────────────┘
               │
   ┌───────────┼───────────────┬───────────────┐
   ▼           ▼               ▼               ▼
┌──────┐  ┌────────┐    ┌────────────┐   ┌─────────────┐
│ PG   │  │ Qdrant │    │ Redis +    │   │ Local FS    │
│ meta │  │ vectors│    │ BullMQ jobs│   │ uploads/    │
│      │  │        │    │            │   │ audio/      │
└──────┘  └────────┘    └────────────┘   └─────────────┘
               │
               ▼
        ┌─────────────────────────────┐
        │ AI Services (HTTP)          │
        │ - LLM (OpenAI / Claude)     │
        │ - Embeddings (OpenAI)       │
        │ - TTS (OpenAI tts-1)        │
        └─────────────────────────────┘
```

### Why these choices

| Choice | Why |
|---|---|
| **NestJS** | Modules / DI / DTOs / guards — production-shape backend, easy to talk about in an interview. |
| **PostgreSQL** | Structured metadata: documents, chunks, podcasts, jobs, quizzes. |
| **Qdrant** | Vector search for RAG. Lightweight, Docker-friendly, separates vectors from metadata cleanly. |
| **Redis + BullMQ** | TTS and script generation are slow (5–60s). Background jobs let the UI show progress instead of blocking. |
| **React + Vite** | Fast dev server, simple SPA — backend is NestJS, so we don't need Next.js's full-stack story. |
| **Local FS for storage** | MVP only. S3 / R2 swap is a one-day change later. |
| **OpenAI TTS (`tts-1`)** | Cheapest path to two distinct voices with one API key. ElevenLabs is the upgrade path for quality. |
| **Per-line audio segments** | Different voices per speaker, easy retry, partial regeneration. Trade-off: need to stitch client-side or with ffmpeg. |

---

## 4. Data Model

```sql
-- Phase 2
documents (
  id UUID PK,
  title TEXT,
  file_url TEXT,         -- local path for MVP
  extracted_text TEXT,
  status TEXT,           -- uploaded | processing | ready | failed
  created_at, updated_at
)

-- Phase 3
document_chunks (
  id UUID PK,
  document_id FK,
  chunk_index INT,
  content TEXT,
  page_number INT,
  start_offset INT,
  end_offset INT,
  created_at
)
-- vector lives in Qdrant, keyed by chunk_id

-- Phase 4-5
podcasts (
  id UUID PK,
  document_id FK,
  script_json JSONB,     -- [{speaker, text}, ...]
  audio_url TEXT,        -- final merged file, or null if segmented
  duration_seconds INT,
  status TEXT,           -- generating_script | generating_audio | ready | failed
  created_at
)

podcast_segments (       -- per-line audio for retry + speaker control
  id UUID PK,
  podcast_id FK,
  segment_index INT,
  speaker TEXT,          -- host_a | host_b
  text TEXT,
  audio_url TEXT,
  duration_ms INT
)

-- Phase 7
quizzes (
  id UUID PK,
  document_id FK,
  questions JSONB,
  created_at
)

flashcards (
  id UUID PK,
  document_id FK,
  cards JSONB,
  created_at
)

-- Phase 8
jobs (
  id UUID PK,
  type TEXT,             -- extract | embed | script | audio | quiz
  entity_id UUID,        -- document_id or podcast_id
  status TEXT,           -- queued | processing | done | failed
  progress INT,          -- 0-100
  current_step TEXT,
  error TEXT,
  created_at, updated_at
)
```

---

## 5. API Surface

```
GET    /health
POST   /documents/upload                    multipart/form-data
GET    /documents/:id
POST   /documents/:id/quiz
POST   /documents/:id/flashcards

POST   /podcasts/generate                   { document_id, duration_minutes, style }
GET    /podcasts/:id
POST   /podcasts/:id/ask                    { question, current_timestamp }
GET    /podcasts/:id/ask/stream             SSE
GET    /podcasts/:id/audio                  serves merged audio
GET    /podcasts/:id/segments/:idx/audio    serves single segment

GET    /jobs/:id/status                     { status, progress, current_step }
```

---

## 6. Phased Build Plan

Each phase is a working slice — end of phase = something demo-able.

### Phase 1 — Scaffold *(in progress)*
- Monorepo: `apps/api` (NestJS) + `apps/web` (React + Vite)
- Docker Compose: Postgres + Redis + Qdrant
- `GET /health` returns `{status:"ok"}`
- Frontend shells: `/upload`, `/documents/:id`, `/podcasts/:id`, `/quiz/:id`

### Phase 2 — Upload + extract
- `POST /documents/upload` → save to `storage/uploads/`, create row, extract text (`pdf-parse`), update status.
- Upload page wired end-to-end.

### Phase 3 — Chunk + embed
- Split extracted text (recursive char splitter, ~800 tokens, 100 overlap).
- Store chunks in PG.
- Embed with `text-embedding-3-small`.
- Upsert to Qdrant with `{document_id, chunk_id, page_number, chunk_index}` payload.

### Phase 4 — Podcast script generation
- `POST /podcasts/generate` enqueues a BullMQ job.
- Job calls LLM with a structured prompt (two hosts, beginner-friendly, grounded, JSON output).
- Validates and stores script JSON.

### Phase 5 — TTS audio
- Job iterates script lines → calls OpenAI TTS (`alloy` for host A, `onyx` for host B).
- Stores each segment as `podcast_segments`.
- **MVP playback**: frontend plays segments back-to-back (no ffmpeg dependency).
- **Upgrade**: ffmpeg concat to single file once installed.

### Phase 6 — Interactive Q&A
- `POST /podcasts/:id/ask`: embed question → Qdrant top-k → LLM with `[chunks]` + question → grounded answer with citations (chunk ids).
- `/ask/stream` is SSE for streaming tokens.
- Frontend: pause player, show answer, resume.

### Phase 7 — Quiz + flashcards
- LLM call over document chunks → structured JSON.
- Frontend renders MCQ with answer reveal + flashcard flip cards.

### Phase 8 — Job UX
- `GET /jobs/:id/status` polled (or SSE) by frontend.
- Document/podcast pages show real progress bars instead of spinners.

### Phase 9 — Frontend polish
- Clean upload UX, podcast player with transcript scroll-along, ask panel.

### Phase 10 — Interview polish
- Architecture diagram in README
- Trade-offs section
- Demo script (3-min walkthrough)

---

## 7. Prompt Design Notes

### Script generator (Phase 4)
The LLM must:
- Produce **strict JSON** matching the script schema (use response_format json).
- Use two distinct voices: a curious learner (host_a) and an explainer (host_b).
- Stay grounded — if the source doesn't cover something, the host should *say* "the document doesn't cover X."
- Include at least one concrete example per major concept.
- Target ~150 words/minute → ~750 words for a 5-min podcast.

### Q&A (Phase 6)
- System prompt: "Answer ONLY from the provided context. If the answer isn't in the context, say so."
- Include chunk citations like `[chunk:abc123]` in the response so the frontend can highlight sources.

### Quiz (Phase 7)
- 5–10 MCQs with one correct answer, three plausible distractors, and a one-sentence explanation each.

---

## 8. Trade-offs Worth Discussing in the Interview

- **Per-segment audio vs merged file** — chose per-segment for voice control + retry granularity; client stitches for MVP.
- **Postgres for chunks + Qdrant for vectors** — keeps source-of-truth text in SQL (greppable, debuggable) while vectors live where ANN search is cheap.
- **Sync vs async** — script + audio are async jobs because they take seconds-to-minutes. Upload + Q&A are sync because users wait on them directly.
- **RAG vs full-context** — full context would work for small PDFs but breaks at scale and costs more per Q&A. RAG generalizes.
- **Browser TTS vs OpenAI TTS** — browser is free but voices are bad and inconsistent across OS. OpenAI tts-1 is $15/1M chars, two decent voices, one API.

---

## 9. Stretch / Future

- Voice interrupt while playing (record → STT → ask)
- Timestamp-aware Q&A (which chunk was playing when paused)
- 5/10/20-min duration toggle
- Multi-language podcasts
- Adaptive quiz difficulty
- "Commute mode" — audio-only nav

---

## 10. Open Decisions / Defaults Taken

These were left open in the original spec; defaults I'm running with unless you push back:

| Question | Default |
|---|---|
| Frontend framework | **React + Vite + react-router** |
| LLM provider | **OpenAI** (`gpt-4o-mini` for cost, `gpt-4o` for script quality) |
| TTS | **OpenAI `tts-1`** (`alloy` + `onyx`) |
| Audio merging | **Client-side sequential playback for MVP**, ffmpeg concat later |
| Repo layout | **pnpm workspace monorepo** (`apps/api`, `apps/web`) |
| Auth | **None for MVP** — single-user demo |
| Deployment | **Local-only for demo** (Docker Compose for infra) |
| Qdrant host port | **7333/7334** (remapped from 6333/6334 to avoid clash with another local project) |
