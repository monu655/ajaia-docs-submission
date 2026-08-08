# AI Workflow Note

## Which AI tools I used

Claude (Anthropic), used conversationally to scaffold and build the
application directly — generating the Express/SQLite backend, the
React/TipTap frontend, the test suite, and this documentation set.

## Where AI materially sped up the work

- **Boilerplate and wiring.** Scaffolding the Vite/TS client, the
  Express/TS server, the Multer upload config, and the Vitest/Supertest
  test harness — mechanical work that would otherwise eat a large
  fraction of a 4-6 hour budget.
- **The `.md` → HTML importer.** Writing a small, deliberately-scoped
  Markdown subset parser (headings, bold, italic, bullet lists) was
  fast to generate and easy to verify against, since the input/output
  contract is simple and testable.
- **The test suite.** Generating the access-control test cases (owner
  vs. non-owner reads, share-then-read, non-owner-cannot-share) in one
  pass, matching the exact permission model the API implements.

## What AI-generated output I changed or rejected

- **Dev server tooling.** The first attempt used `ts-node-dev`, which
  failed at startup with a TypeScript-version incompatibility in this
  environment. Rather than debug that dependency chain, I swapped it
  for `tsx`, which is simpler and worked immediately — a case of not
  being precious about a first choice when it's fighting the toolchain.
- **A duplicated route registration.** An early draft of the health
  check route (`/api/health`) got added twice — once correctly before
  the auth middleware, once left over after moving it — which would
  have caused a silent duplicate-handler bug. Caught by reviewing the
  diff before testing, not by the tests themselves.
- **`tsconfig.json` moduleResolution.** Initial config used a
  `moduleResolution` value that's been removed in the TypeScript version
  this project installed; fixed after `tsc --noEmit` surfaced it.
- **Attachments scope.** Generated a second attachment-upload feature
  (arbitrary file attached to a document) beyond the minimum the brief
  asked for; kept it because it was cheap and demonstrates a second,
  simpler take on "file upload," but did not let it grow beyond a
  bare upload/list/download loop.

## How I verified correctness, UX quality, and implementation reliability

- **Type checking**: `tsc --noEmit` run on both client and server after
  every meaningful change, not just at the end.
- **Automated tests**: the 8-case Vitest/Supertest suite (auth
  rejection, creation, validation, cross-user access denial, share →
  read, non-owner cannot share, owned/shared list separation, `.md`
  import success and rejection) was run and confirmed passing, not just
  written.
- **Live smoke test**: started both the server and the client dev
  server for real, and exercised the actual HTTP flow end to end with
  curl through the Vite proxy — create a document, edit its content,
  share it with a second seeded user, confirm that user can read it and
  cannot re-share it, and confirm the owned/shared split in the list
  endpoint — before treating any of it as "done."
- **Production build**: ran `npm run build` on the client to catch
  bundler-level issues that `tsc --noEmit` alone wouldn't (e.g. code
  that type-checks but doesn't actually bundle cleanly).
- What I did **not** get to do in this pass: manual click-through
  testing of the UI in a real browser (only verified via HTML/API
  responses and code review) and cross-browser checks — flagged here
  rather than implied to be covered.
