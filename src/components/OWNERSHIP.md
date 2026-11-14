# Component ownership

## Developer 2 — own these folders

- `podcast/` — player, transcript, sources, speaker UI
- `guests/` — guest cards, selection, customization
- `audio/` — playback controls, queue, mic, visualizer
- `configuration/` — topic/region/duration/depth controls
- `ui/` — shared presentational primitives

## Developer 1

Do not place backend/agent logic in these folders. Prefer `src/services`, `src/mastra`, and `src/app/api`.
