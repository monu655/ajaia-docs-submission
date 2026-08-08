import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { nanoid } from "nanoid";
import { db } from "./db";
import { requireUser, AuthedRequest } from "./auth";
import { fileToHtml } from "./importFile";
import { DocumentRow, User } from "./types";
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 5 * 1024 * 1024 },
});
export const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
const now = () => new Date().toISOString();
app.get("/api/users", (_req, res) => {
  const users = db.prepare("SELECT id, name, email FROM users").all();
  res.json(users);
});
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use(requireUser);
app.get("/api/documents", (req: AuthedRequest, res) => {
  const userId = req.user!.id;
  const owned = db
    .prepare("SELECT * FROM documents WHERE owner_id = ? ORDER BY updated_at DESC")
    .all(userId) as unknown as DocumentRow[];
  const shared = db
    .prepare(
      `SELECT d.* FROM documents d
       JOIN shares s ON s.document_id = d.id
       WHERE s.user_id = ?
       ORDER BY d.updated_at DESC`
    )
    .all(userId) as unknown as DocumentRow[];
  res.json({
    owned: owned.map(toDocSummary),
    shared: shared.map(toDocSummary),
  });
});
function toDocSummary(d: DocumentRow) {
  return {
    id: d.id,
    title: d.title,
    ownerId: d.owner_id,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  };
}
app.post("/api/documents", (req: AuthedRequest, res) => {
  const { title } = req.body as { title?: string };
  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Title is required" });
  }
  const id = nanoid();
  const ts = now();
  db.prepare(
    `INSERT INTO documents (id, title, content, owner_id, created_at, updated_at)
     VALUES (?, ?, '', ?, ?, ?)`
  ).run(id, title.trim(), req.user!.id, ts, ts);
  res.status(201).json(getDocOr404(id, req.user!.id, res, true));
});
function getAccessibleDoc(id: string, userId: string): DocumentRow | undefined {
  const doc = db.prepare("SELECT * FROM documents WHERE id = ?").get(id) as unknown as
    | DocumentRow
    | undefined;
  if (!doc) return undefined;
  if (doc.owner_id === userId) return doc;
  const share = db
    .prepare("SELECT 1 FROM shares WHERE document_id = ? AND user_id = ?")
    .get(id, userId);
  return share ? doc : undefined;
}
function getDocOr404(id: string, userId: string, res: express.Response, skipSend = false) {
  const doc = getAccessibleDoc(id, userId);
  if (!doc) {
    if (!skipSend) res.status(404).json({ error: "Document not found" });
    return null;
  }
  const shares = db
    .prepare(
      `SELECT u.id as userId, u.name, u.email FROM shares s
       JOIN users u ON u.id = s.user_id WHERE s.document_id = ?`
    )
    .all(id);
  const owner = db.prepare("SELECT id, name, email FROM users WHERE id = ?").get(doc.owner_id);
  const payload = {
    id: doc.id,
    title: doc.title,
    content: doc.content,
    ownerId: doc.owner_id,
    owner,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
    sharedWith: shares,
    isOwner: doc.owner_id === userId,
  };
  if (!skipSend) res.json(payload);
  return payload;
}
app.get("/api/documents/:id", (req: AuthedRequest, res) => {
  getDocOr404(req.params.id as string, req.user!.id, res);
});
app.put("/api/documents/:id", (req: AuthedRequest, res) => {
  const userId = req.user!.id;
  const doc = getAccessibleDoc(req.params.id as string, userId);
  if (!doc) return res.status(404).json({ error: "Document not found" });
  const { title, content } = req.body as { title?: string; content?: string };
  if (title !== undefined && !title.trim()) {
    return res.status(400).json({ error: "Title cannot be empty" });
  }
  const newTitle = title !== undefined ? title.trim() : doc.title;
  const newContent = content !== undefined ? content : doc.content;
  db.prepare(
    "UPDATE documents SET title = ?, content = ?, updated_at = ? WHERE id = ?"
  ).run(newTitle, newContent, now(), doc.id);
  getDocOr404(doc.id, userId, res);
});
app.delete("/api/documents/:id", (req: AuthedRequest, res) => {
  const userId = req.user!.id;
  const doc = db.prepare("SELECT * FROM documents WHERE id = ?").get(req.params.id as string) as unknown as
    | DocumentRow
    | undefined;
  if (!doc || doc.owner_id !== userId) {
    return res.status(404).json({ error: "Document not found" });
  }
  db.prepare("DELETE FROM shares WHERE document_id = ?").run(doc.id);
  db.prepare("DELETE FROM attachments WHERE document_id = ?").run(doc.id);
  db.prepare("DELETE FROM documents WHERE id = ?").run(doc.id);
  res.status(204).send();
});
app.post("/api/documents/:id/share", (req: AuthedRequest, res) => {
  const userId = req.user!.id;
  const doc = db.prepare("SELECT * FROM documents WHERE id = ?").get(req.params.id as string) as unknown as
    | DocumentRow
    | undefined;
  if (!doc || doc.owner_id !== userId) {
    return res.status(404).json({ error: "Document not found" });
  }
  const { userId: targetUserId } = req.body as { userId?: string };
  if (!targetUserId) return res.status(400).json({ error: "userId is required" });
  if (targetUserId === userId) {
    return res.status(400).json({ error: "Cannot share a document with yourself" });
  }
  const target = db.prepare("SELECT id FROM users WHERE id = ?").get(targetUserId);
  if (!target) return res.status(404).json({ error: "Target user not found" });
  db.prepare(
    "INSERT OR IGNORE INTO shares (document_id, user_id, permission) VALUES (?, ?, 'edit')"
  ).run(doc.id, targetUserId);
  getDocOr404(doc.id, userId, res);
});
app.delete("/api/documents/:id/share/:userId", (req: AuthedRequest, res) => {
  const userId = req.user!.id;
  const doc = db.prepare("SELECT * FROM documents WHERE id = ?").get(req.params.id as string) as unknown as
    | DocumentRow
    | undefined;
  if (!doc || doc.owner_id !== userId) {
    return res.status(404).json({ error: "Document not found" });
  }
  db.prepare("DELETE FROM shares WHERE document_id = ? AND user_id = ?").run(
    doc.id,
    req.params.userId as string
  );
  getDocOr404(doc.id, userId, res);
});
app.post(
  "/api/documents/import",
  upload.single("file"),
  (req: AuthedRequest, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (![".txt", ".md"].includes(ext)) {
      fs.unlink(req.file.path, () => {});
      return res
        .status(400)
        .json({ error: "Only .txt and .md files can be imported as documents" });
    }
    const raw = fs.readFileSync(req.file.path, "utf-8");
    fs.unlink(req.file.path, () => {});
    const html = fileToHtml(raw, ext);
    const title = path.basename(req.file.originalname, ext) || "Imported document";
    const id = nanoid();
    const ts = now();
    db.prepare(
      `INSERT INTO documents (id, title, content, owner_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, title, html, req.user!.id, ts, ts);
    res.status(201).json(getDocOr404(id, req.user!.id, res, true));
  }
);
app.post(
  "/api/documents/:id/attachments",
  upload.single("file"),
  (req: AuthedRequest, res) => {
    const userId = req.user!.id;
    const doc = getAccessibleDoc(req.params.id as string, userId);
    if (!doc) return res.status(404).json({ error: "Document not found" });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const id = nanoid();
    db.prepare(
      `INSERT INTO attachments (id, document_id, filename, original_name, uploaded_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(id, doc.id, req.file.filename, req.file.originalname, now());
    res.status(201).json({ id, originalName: req.file.originalname });
  }
);
app.get("/api/documents/:id/attachments", (req: AuthedRequest, res) => {
  const userId = req.user!.id;
  const doc = getAccessibleDoc(req.params.id as string, userId);
  if (!doc) return res.status(404).json({ error: "Document not found" });
  const rows = db
    .prepare(
      "SELECT id, original_name as originalName, uploaded_at as uploadedAt FROM attachments WHERE document_id = ?"
    )
    .all(doc.id);
  res.json(rows);
});
app.get("/api/attachments/:id/download", (req: AuthedRequest, res) => {
  const userId = req.user!.id;
  const row = db
    .prepare("SELECT * FROM attachments WHERE id = ?")
    .get(req.params.id as string) as unknown as
    | { id: string; document_id: string; filename: string; original_name: string }
    | undefined;
  if (!row) return res.status(404).json({ error: "Attachment not found" });
  const doc = getAccessibleDoc(row.document_id, userId);
  if (!doc) return res.status(404).json({ error: "Attachment not found" });
  res.download(path.join(uploadsDir, row.filename), row.original_name);
});