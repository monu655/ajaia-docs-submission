# Ajaia Docs — Lightweight Collaborative Document Editor

A small full-stack document editor: create and edit rich-text documents,
import `.txt`/`.md` files into new documents, attach files to a document,
and share documents with other users. Built for the Ajaia take-home
assignment.

## Stack

- **Client:** Vite + React + TypeScript, TipTap (rich text editor),
  Zustand (current-user state), React Router.
- **Server:** Node + Express + TypeScript, SQLite via `better-sqlite3`,
  Multer for file uploads.
- **Tests:** Vitest + Supertest (backend integration tests).

## Prerequisites

- Node.js 20+ and npm.

## Setup — run locally

Two processes: the API server (port 4000) and the Vite dev server (port
5173, which proxies `/api` to the server). Open two terminals.

**Terminal 1 — server**
```bash
cd server
npm install
npm run dev
```
The server seeds three demo users on first run and creates a SQLite file
at `server/data/app.db`. No environment variables are required.

> **Note on `better-sqlite3`:** it ships prebuilt native binaries for
> common platforms, but `npm install` can still attempt a from-source
> rebuild as a fallback on some setups. If `npm install` fails inside
> `better-sqlite3`, install Python 3 and standard build tools (on
> Debian/Ubuntu: `sudo apt-get install -y python3 build-essential`) and
> re-run `npm install` — this is a one-time environment requirement, not
> a project bug.

**Terminal 2 — client**
```bash
cd client
npm install
npm run dev
```
Visit the URL Vite prints (typically `http://localhost:5173`).

## Demo / seeded users

There is no real authentication. On load, the app shows a picker with
three seeded users — pick one to "log in" as them:

| Name | Used to demo |
|---|---|
| Asha Rao | Create/own documents, share with Ben and Chen |
| Ben Okafor | Receive shared documents, see the owned/shared split |
| Chen Wei | A second recipient, to show sharing with more than one person |

To test sharing end to end: log in as Asha, create a document, click
**Share**, grant access to Ben. Then switch user (top-right) and log in
as Ben — the document appears under "Shared with you" and is read/write
but Ben cannot re-share it or delete it.

## What works

- Create, rename, edit, and delete documents.
- Rich text: bold, italic, underline, headings (H1/H2), bulleted and
  numbered lists.
- Autosave ~700ms after you stop typing, with a save-status indicator.
- Import a `.txt` or `.md` file as a new document. Markdown headings
  (`#`/`##`/`###`), `**bold**`, `_italic_`, and `- ` bullet lists are
  converted to formatted content; everything else becomes plain
  paragraphs. **Only `.txt` and `.md` are supported for import** — this
  is stated in the New Document dialog. `.docx` import was out of scope
  for the timebox (see ARCHITECTURE.md).
- Separately, any file type can be attached to an existing document
  (stored and downloadable, not parsed into the editor).
- Sharing: owner grants/revokes access per user; shared users get
  read/write but cannot share further or delete the document; the
  dashboard visually separates "Your documents" from "Shared with you".
- Persistence via SQLite — documents, titles, formatting, and sharing
  survive a refresh and a server restart.

## What's incomplete / explicitly deprioritized

- **Real authentication.** Replaced with a seeded-user picker (see
  ARCHITECTURE.md for the tradeoff).
- **Real-time collaboration** (multiple people editing simultaneously
  with live cursors). Out of scope per the assignment's stretch-goal
  list; last write wins on save.
- **`.docx` import.** Only `.txt`/`.md` are parsed into editable
  documents; this limitation is shown in the UI.
- **Granular sharing permissions** (view-only vs. edit). Every share
  grant is currently edit-access; a `permission` column already exists
  in the schema to extend this later.
- **Version history / undo beyond the browser session.**

With another 2-4 hours, the next priorities would be: view-only sharing,
a "revert to previous version" feature (the schema change is small —
snapshot `content` on each save), and code-splitting the client bundle
(TipTap + StarterKit currently produce one ~630KB chunk).

## Tests

```bash
cd server
npm test
```
Covers: rejecting unauthenticated requests, document creation and
validation, access control (a document is invisible to a user it hasn't
been shared with), the owner-only share/unshare flow, the owned/shared
list split, and both the success and rejection paths of the `.md`
import feature.

## Deployment

See `SUBMISSION.md` for the live deployment link. To deploy this
yourself: the `server` folder is a standard Node/Express app (deploy to
Render, Railway, or Fly.io — set `PORT` if the platform requires it, and
mount a persistent volume at `server/data` and `server/uploads` if you
want uploads to survive restarts). The `client` folder builds to static
files (`npm run build` → `client/dist`) deployable to Vercel or Netlify;
point its `/api` requests at the deployed server's URL (e.g. via a
`vite.config.ts` proxy in dev, or a rewrite rule / env-based base URL in
production).
