# SanD Hacks 2026 — Interactive AI Podcast

Personalized AI podcast platform: assemble a guest panel, generate a news discussion, and join the conversation.

See `CLAUDE.md` for full product, architecture, and priority guidance.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Gemini + Mastra (Developer 1)
- Bright Data (Developer 1)
- ElevenLabs (Developer 2)
- Neon PostgreSQL (shared, optional for MVP)

## Quick start

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Ownership

| Area | Owner | Paths |
|------|--------|--------|
| News, Gemini, Mastra, podcast APIs | Developer 1 | `src/services/bright-data`, `src/services/news`, `src/mastra`, `src/app/api/podcast` |
| UI, ElevenLabs, audio APIs | Developer 2 | `src/components/**`, `src/app/(pages)`, `src/services/elevenlabs`, `src/app/api/audio`, `src/lib/audio`, `src/hooks` |
| Shared contracts | Both | `src/types`, `src/lib/api/client.ts`, `src/lib/sessions.ts` |

Agree on types in `src/types` before changing API shapes.

## API contracts (stubs)

| Method | Path | Status |
|--------|------|--------|
| POST | `/api/podcast/generate` | 501 stub (Dev 1) |
| POST | `/api/podcast/next` | 501 stub (Dev 1) |
| POST | `/api/podcast/interact` | 501 stub (Dev 1) |
| POST | `/api/podcast/resume` | 501 stub (Dev 1) |
| GET | `/api/podcast/history` | Works (in-memory) |
| GET | `/api/podcast/:id` | Works (in-memory) |
| POST | `/api/audio/generate` | 501 stub (Dev 2) |
| POST | `/api/audio/transcribe` | 501 stub (Dev 2) |
| POST | `/api/news/search` | Live/mock news search (Dev 1) |

Typed client: `src/lib/api/client.ts`.

## News Engine (Developer 1) — COMPLETE

Set in `.env.local`:
- `BRIGHT_DATA_API_KEY` + `BRIGHT_DATA_ZONE` (SERP)
- `BRIGHT_DATA_UNLOCKER_ZONE` (article scrape)
- `GOOGLE_GENERATIVE_AI_API_KEY` (summary + claims + cross-ref)

```bash
curl -X POST http://localhost:3000/api/news/search \
  -H 'Content-Type: application/json' \
  -d '{"topics":["technology","business"],"region":"us","language":"en","maxEnrichArticles":2}'
```

Without credentials, the endpoint returns clearly labeled mock news (`isMock: true`).
Use `"skipEnrichment": true` for faster SERP-only tests.

## Current milestone

- Phase 0 scaffold complete
- News Engine complete (SERP + Unlocker + Gemini analysis + cross-ref)
- Next for Developer 1: Podcast Generator (`/api/podcast/generate`)
