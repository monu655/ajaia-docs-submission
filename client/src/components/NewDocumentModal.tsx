import { useRef, useState } from "react";
import Modal from "./Modal";
import { api } from "../api/client";

export default function NewDocumentModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (docId: string) => void;
}) {
  const [mode, setMode] = useState<"blank" | "import">("blank");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleCreateBlank() {
    if (!title.trim()) {
      setError("Please enter a title.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const doc = await api.createDocument(title.trim());
      onCreated(doc.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create document");
    } finally {
      setBusy(false);
    }
  }

  async function handleImport() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Choose a .txt or .md file first.");
      return;
    }
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (![".txt", ".md"].includes(ext)) {
      setError("Only .txt and .md files can be imported.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const doc = await api.importDocument(file);
      onCreated(doc.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to import file");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="New document" onClose={onClose}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          className="btn"
          style={mode === "blank" ? { borderColor: "var(--accent)" } : {}}
          onClick={() => setMode("blank")}
        >
          Start blank
        </button>
        <button
          className="btn"
          style={mode === "import" ? { borderColor: "var(--accent)" } : {}}
          onClick={() => setMode("import")}
        >
          Import a file
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {mode === "blank" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="text"
            placeholder="Document title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <button className="btn btn-primary" onClick={handleCreateBlank} disabled={busy}>
            {busy ? "Creating…" : "Create document"}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
            Upload a .txt or .md file. It becomes a new editable document — headings,
            bold, italic, and bullet lists in Markdown are preserved.
          </p>
          <input ref={fileInputRef} type="file" accept=".txt,.md,text/plain,text/markdown" />
          <button className="btn btn-primary" onClick={handleImport} disabled={busy}>
            {busy ? "Importing…" : "Import file"}
          </button>
        </div>
      )}
    </Modal>
  );
}
