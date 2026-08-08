# Submission

## Included in this folder

- `server/` — Express + TypeScript + SQLite backend, with tests
  (`server/src/__tests__/documents.test.ts`)
- `client/` — Vite + React + TypeScript frontend
- `README.md` — setup/run instructions, seeded demo users, what
  works and what's incomplete
- `ARCHITECTURE.md` — architecture note and tradeoffs
- `AI_WORKFLOW.md` — AI tool usage disclosure
- `SUBMISSION.md` — this file
- `WALKTHROUGH_VIDEO_URL.txt` — link to the walkthrough video

## Live product URL

**TODO:** not deployed yet. See the "Deployment" section of
`README.md` for the recommended path (server → Render/Railway/Fly.io,
client → Vercel/Netlify). Paste the live URL here once deployed.

## Test accounts / seeded users

No password is required — the app has a user picker on load. See the
"Demo / seeded users" section of `README.md` for the three seeded
users and a suggested sharing walkthrough.

## Local run

```bash
cd server && npm install && npm run dev   # terminal 1, port 4000
cd client && npm install && npm run dev   # terminal 2, port 5173
```

## Status

- What is working: see the "What works" section of `README.md`.
- What is incomplete: see the "What's incomplete / explicitly
  deprioritized" section of `README.md`, including what I'd build next
  with another 2-4 hours.

## Walkthrough video

**TODO:** record a 3-5 minute walkthrough (unlisted YouTube or Loom is
fine) covering: the main user flow, what works end to end, what was
intentionally deprioritized, key implementation decisions, and how AI
supported the workflow (per `AI_WORKFLOW.md`). Paste the link in
`WALKTHROUGH_VIDEO_URL.txt`.
