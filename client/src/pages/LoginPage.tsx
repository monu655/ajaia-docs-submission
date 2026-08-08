import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type UserSummary } from "../api/client";
import { useUserStore } from "../store/userStore";

export default function LoginPage() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const login = useUserStore((s) => s.login);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .listUsers()
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function handleSelect(user: UserSummary) {
    login(user);
    navigate("/documents");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div className="card" style={{ padding: 40, width: 380 }}>
        <h1 style={{ fontSize: 24, margin: "0 0 4px" }}>Ajaia Docs</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 24px" }}>
          This demo skips real authentication. Pick a seeded user to continue —
          you'll see their owned and shared documents.
        </p>
        {error && <div className="error-banner">{error}</div>}
        {loading && <p style={{ color: "var(--text-muted)" }}>Loading users…</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {users.map((u) => (
            <button
              key={u.id}
              className="btn"
              style={{ textAlign: "left", padding: "12px 14px" }}
              onClick={() => handleSelect(u)}
            >
              <div style={{ fontWeight: 600 }}>{u.name}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{u.email}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
