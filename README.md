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

Typed client: `src/lib/api/client.ts`.

## Phase 0 complete

- Next.js app scaffold with `src/` layout from `CLAUDE.md`
- Shared TypeScript domain + API types
- Route stubs for podcast and audio
- Mock news/guests, in-memory sessions, validation helpers
- Placeholder pages/hooks for Developer 2

Next for Developer 1: implement the News Engine (`src/services/news` + Bright Data).
