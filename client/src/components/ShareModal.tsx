import { useEffect, useState } from "react";
import Modal from "./Modal";
import { api, type DocDetail, type UserSummary } from "../api/client";
import { useUserStore } from "../store/userStore";

export default function ShareModal({
  doc,
  onClose,
  onUpdated,
}: {
  doc: DocDetail;
  onClose: () => void;
  onUpdated: (doc: DocDetail) => void;
}) {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const currentUser = useUserStore((s) => s.currentUser);

  useEffect(() => {
    api.listUsers().then(setUsers).catch(() => {});
  }, []);

  const sharedIds = new Set(doc.sharedWith.map((u) => u.id));
  const shareable = users.filter(
    (u) => u.id !== currentUser?.id && !sharedIds.has(u.id)
  );

  async function grant(userId: string) {
    setBusyUserId(userId);
    setError(null);
    try {
      const updated = await api.shareDocument(doc.id, userId);
      onUpdated(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to share");
    } finally {
      setBusyUserId(null);
    }
  }

  async function revoke(userId: string) {
    setBusyUserId(userId);
    setError(null);
    try {
      const updated = await api.unshareDocument(doc.id, userId);
      onUpdated(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to revoke access");
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <Modal title={`Share "${doc.title}"`} onClose={onClose}>
      {error && <div className="error-banner">{error}</div>}

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>
          HAS ACCESS
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
          <span>{doc.owner.name} <span style={{ color: "var(--text-muted)", fontSize: 12 }}>(owner)</span></span>
        </div>
        {doc.sharedWith.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Not shared with anyone yet.</p>
        )}
        {doc.sharedWith.map((u) => (
          <div
            key={u.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "6px 0",
            }}
          >
            <span>{u.name}</span>
            <button
              className="btn btn-ghost btn-danger"
              style={{ fontSize: 12, padding: "4px 8px" }}
              onClick={() => revoke(u.id)}
              disabled={busyUserId === u.id}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {shareable.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>
            ADD PEOPLE
          </div>
          {shareable.map((u) => (
            <div
              key={u.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 0",
              }}
            >
              <span>{u.name}</span>
              <button
                className="btn"
                style={{ fontSize: 12, padding: "4px 10px" }}
                onClick={() => grant(u.id)}
                disabled={busyUserId === u.id}
              >
                {busyUserId === u.id ? "Sharing…" : "Share"}
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
