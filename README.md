# RondoFM — The Podcast You're Part Of

An interactive AI podcast platform built for **SanD Hacks 2026**. Pick your topics, assemble a panel of AI guests, generate a live news discussion, and — unlike any podcast app before it — actually join the conversation mid-episode by voice or text.

Spotify is a podcast you listen to. NotebookLM generates a podcast for you. RondoFM is a podcast you're part of.

## Team

| Name |
|------|
| Pax Poonapanont |
| Andy Ly |

## What it does

- **Real news, not canned scripts.** Bright Data pulls live articles and search results; Gemini analyzes, summarizes, and cross-references claims across sources.
- **A panel you build.** Pick from preset guest personas or create your own (name, expertise, personality, voice) — up to 3 per episode, plus an always-on AI host.
- **Multi-agent generation.** A Mastra Producer agent shapes the episode brief, a Moderator agent decides who speaks next, and independent Guest agents hold distinct, sometimes conflicting opinions. Episodes generate turn-by-turn as you listen, not as one static script.
- **Real voices.** Every panelist speaks in a distinct ElevenLabs voice, synced tightly to a live, scrollable transcript.
- **Actually interactive.** Hit interrupt mid-episode, ask anything by voice or text, get a grounded answer (with live research pulled in if needed), then resume the original discussion exactly where you left off.

## Stack

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS
- **Agent orchestration:** Mastra (Producer, Moderator, Guest agents)
- **AI model:** Google Gemini
- **Research:** Bright Data (SERP search + Web Unlocker article scraping)
- **Voice:** ElevenLabs (text-to-speech + speech-to-text)
- **Hosting:** Vercel
- **Storage:** In-memory session store — no database required for the MVP

## Quick start

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without API credentials set, the app falls back to clearly labeled mock news and demo content so the UI is still fully explorable.

## Environment variables

Set these in `.env.local` (see `.env.example`):

| Variable | Required | Purpose |
|---|---|---|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Yes | Gemini — news analysis, episode scripting, agent reasoning |
| `BRIGHT_DATA_API_KEY` + `BRIGHT_DATA_ZONE` | Yes | Live news search (SERP) |
| `BRIGHT_DATA_UNLOCKER_ZONE` | Optional | Full-article scraping for deeper research |
| `ELEVENLABS_API_KEY` | Yes | Text-to-speech and speech-to-text |
| `GEMINI_MODEL` | Optional | Override the default model |
| `DATABASE_URL` | Not used | The app runs on in-memory sessions |

## Project structure

```
src/
  app/            Pages (home, configure/Experience, history) + API routes
  components/     Player, guest avatars, audio UI, configuration
  mastra/         Producer, Moderator, and Guest agents + tools
  services/       Bright Data, Gemini, ElevenLabs, podcast generation/interaction
  lib/            Session store, validation, typed API client
  hooks/          Audio queue + turn-audio playback hooks
  types/          Shared domain types and API contracts
```

See `CLAUDE.md` for the full product spec, architecture, and detailed implementation status.

## Testing

```bash
npm run test       # vitest — unit tests for conversation/turn-generation logic
npm run lint
npm run build
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run test` | Run the vitest suite |
| `npm run lint` | Lint the codebase |
| `npm run mastra:dev` | Launch Mastra Studio for local agent debugging |
