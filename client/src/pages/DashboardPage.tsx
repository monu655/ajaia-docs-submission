import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type DocumentsList } from "../api/client";
import { useUserStore } from "../store/userStore";
import NewDocumentModal from "../components/NewDocumentModal";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DashboardPage() {
  const [docs, setDocs] = useState<DocumentsList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const currentUser = useUserStore((s) => s.currentUser);
  const logout = useUserStore((s) => s.logout);
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  function load() {
    api
      .listDocuments()
      .then(setDocs)
      .catch((e) => setError(e.message));
  }

  async function handleDelete(id: string, title: string) {
    const ok = window.confirm(`Delete "${title}"? This cannot be undone.`);
    if (!ok) return;
    setDeletingId(id);
    setError(null);
    try {
      await api.deleteDocument(id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete document");
    } finally {
      setDeletingId(null);
    }
  }

  if (!currentUser) return null;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 32,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 26 }}>Ajaia Docs</h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: 14 }}>
            Signed in as {currentUser.name}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>
            + New document
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Switch user
          </button>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 15, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>
          Your documents
        </h2>
        {docs && docs.owned.length === 0 && (
          <p style={{ color: "var(--text-muted)" }}>No documents yet — create one to get started.</p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {docs?.owned.map((d) => (
            <div
              key={d.id}
              className="card"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 18px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
              }}
            >
              <button
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  flex: 1,
                  textAlign: "left",
                  padding: 0,
                }}
                onClick={() => navigate(`/documents/${d.id}`)}
              >
                <span style={{ fontWeight: 600 }}>{d.title}</span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Updated {formatDate(d.updatedAt)}
                </span>
              </button>
              <button
                className="btn btn-ghost btn-danger"
                style={{ fontSize: 12, padding: "4px 10px", marginLeft: 12 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(d.id, d.title);
                }}
                disabled={deletingId === d.id}
              >
                {deletingId === d.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 15, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>
          Shared with you
        </h2>
        {docs && docs.shared.length === 0 && (
          <p style={{ color: "var(--text-muted)" }}>Nothing has been shared with you yet.</p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {docs?.shared.map((d) => (
            <button
              key={d.id}
              className="card"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 18px",
                textAlign: "left",
                border: "1px solid var(--border)",
                background: "var(--surface)",
              }}
              onClick={() => navigate(`/documents/${d.id}`)}
            >
              <span style={{ fontWeight: 600 }}>{d.title}</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Updated {formatDate(d.updatedAt)}
              </span>
            </button>
          ))}
        </div>
      </section>

      {showNew && (
        <NewDocumentModal
          onClose={() => setShowNew(false)}
          onCreated={(id) => navigate(`/documents/${id}`)}
        />
      )}
    </div>
  );
}