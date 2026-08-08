import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";

const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Tests set DB_FILE to an isolated throwaway path so they never touch
// the real app.db.
const dbPath = process.env.DB_FILE || path.join(dataDir, "app.db");

export const db = new DatabaseSync(dbPath);

db.exec("PRAGMA journal_mode = WAL;");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  owner_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS shares (
  document_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  permission TEXT NOT NULL DEFAULT 'edit',
  PRIMARY KEY (document_id, user_id),
  FOREIGN KEY (document_id) REFERENCES documents(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  uploaded_at TEXT NOT NULL,
  FOREIGN KEY (document_id) REFERENCES documents(id)
);
`);

// Seed a few fixed demo users so sharing can be demoed without real auth.
const seedUsers = [
  { id: "u_asha", name: "Asha Rao", email: "asha@example.com" },
  { id: "u_ben", name: "Ben Okafor", email: "ben@example.com" },
  { id: "u_chen", name: "Chen Wei", email: "chen@example.com" },
];

const insertUser = db.prepare(
  "INSERT OR IGNORE INTO users (id, name, email) VALUES (?, ?, ?)"
);

db.exec("BEGIN");
try {
  for (const u of seedUsers) {
    insertUser.run(u.id, u.name, u.email);
  }
  db.exec("COMMIT");
} catch (e) {
  db.exec("ROLLBACK");
  throw e;
}