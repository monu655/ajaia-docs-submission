# Architecture Note

## What I prioritized, and why

The brief is explicit that depth in a few areas beats shallow coverage
everywhere, so I picked four things to do properly and cut everything
else:

1. **A genuinely usable rich-text editor.** TipTap over a raw
   `contenteditable` or a plain textarea, because "usable and coherent"
   was called out directly in the brief, and a half-working custom
   editor would have been worse than a well-configured library.
2. **Real access control, not a cosmetic sharing UI.** The server
   checks ownership/share membership on every read and write, not just
   the list endpoint — so a user can't fetch a document by guessing its
   ID even if the UI never shows them a link to it. This felt like the
   part of the brief most likely to be tested by an actual reviewer
   trying to break it.
3. **A file-upload path that's actually product-relevant**, per the
   brief's own framing: importing a `.txt`/`.md` file converts it into
   a new, immediately-editable document (not just a stored blob), which
   is the more interesting of the two example behaviors listed in the
   brief. I added file attachments as a second, simpler upload path
   since it was cheap to add once Multer was wired up, but I did not
   invest further time in it.
4. **Persistence that survives restarts**, not just page refresh —
   SQLite on disk rather than an in-memory store, since the brief asks
   reviewers to test the deployed build later, potentially after the
   process has restarted.

## What I deliberately cut

- **Real authentication.** Implementing password or OAuth-based auth
  well takes real time and isn't where this exercise is trying to
  differentiate candidates. I used a fixed set of seeded users and a
  `x-user-id` header the client sends on every request. Critically,
  the *authorization* logic downstream of that (who can read/write/share
  which document) is fully real and tested — swapping the header check
  for a session cookie or JWT later is a small, isolated change (see
  `server/src/auth.ts`), not a rewrite.
- **Real-time collaboration.** Explicitly listed as a stretch goal, not
  core scope. The document model (single `content` column, last write
  wins) doesn't support concurrent editing, which is a real limitation
  I'd flag to a reviewer rather than paper over.
- **View-only vs. edit permissions.** The `shares` table already has a
  `permission` column for this, but the API doesn't act on it yet — I'd
  rather ship a working binary "has access / doesn't" than a
  half-implemented permission system with untested edge cases.
- **`.docx` parsing.** Real `.docx` parsing needs a library (e.g.
  `mammoth`) and meaningfully more testing to get formatting right; I
  judged that time was better spent making the `.txt`/`.md` path solid
  and well-tested than adding a third, thinner format.

## Data model

```
users(id, name, email)
documents(id, title, content, owner_id, created_at, updated_at)
shares(document_id, user_id, permission)        -- composite PK
attachments(id, document_id, filename, original_name, uploaded_at)
```

`content` stores the document body as sanitized-by-construction HTML
(TipTap's `getHTML()` output), not raw user HTML from a `<textarea>` —
the only place external content enters this field is through TipTap's
own editing commands or the server-side Markdown-to-HTML converter used
for import, not through unescaped user input.

## Request flow

Client → Vite dev proxy (`/api/*` → `http://localhost:4000`) → Express
→ `requireUser` middleware validates `x-user-id` against the `users`
table → route handler checks ownership/share membership via
`getAccessibleDoc()` before touching any document → SQLite (synchronous,
via `better-sqlite3`, which is fine at this scale and keeps the route
handlers simple — no async DB code to get wrong under time pressure).

## Autosave

The client debounces edits (700ms after the last keystroke) rather than
saving on every keystroke, to keep the write volume reasonable and
avoid a save-in-flight race with the very next keystroke. There's no
optimistic-concurrency check on save (no version/ETag comparison) —
acceptable for single-editor-at-a-time use, and flagged above as the
reason real-time collaboration is out of scope rather than half-built.
