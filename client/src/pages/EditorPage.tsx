import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { api, type DocDetail } from "../api/client";
import { useUserStore } from "../store/userStore";
import EditorToolbar from "../components/EditorToolbar";
import ShareModal from "../components/ShareModal";

type SaveStatus = "idle" | "saving" | "saved" | "error";
type AttachmentItem = { id: string; originalName: string; uploadedAt: string };

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useUserStore((s) => s.currentUser);

  const [doc, setDoc] = useState<DocDetail | null>(null);
  const [title, setTitle] = useState("");
  const titleRef = useRef("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [showShare, setShowShare] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentLoadedRef = useRef(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
    onUpdate: () => scheduleSave(),
  });

  // Fetch the document ONCE per id. Does NOT depend on editor.
  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    if (!id) return;
    contentLoadedRef.current = false;
    api.getDocument(id).then((d) => {
      setDoc(d);
      setTitle(d.title);
      titleRef.current = d.title;
    }).catch((e) => setLoadError(e.message));
    api.listAttachments?.(id).then(setAttachments).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, currentUser]);

  // Once BOTH the doc and a live editor exist, push content in exactly once.
  useEffect(() => {
    if (!doc || !editor || editor.isDestroyed) return;
    if (contentLoadedRef.current) return;
    editor.commands.setContent(doc.content || "");
    contentLoadedRef.current = true;
  }, [doc, editor]);

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => doSave(), 700);
  }, []);

  async function doSave(overrides?: { title?: string }) {
    if (!id) return;
    setSaveStatus("saving");
    try {
      const html = editor?.getHTML() ?? "";
      const updated = await api.updateDocument(id, {
        title: overrides?.title ?? titleRef.current,
        content: html,
      });
      setDoc(updated);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }

  function handleTitleBlur() {
    if (doc && title.trim() && title !== doc.title) {
      doSave({ title });
    }
  }

  async function handleAttach() {
    const file = attachInputRef.current?.files?.[0];
    if (!file || !id) return;
    try {
      await api.uploadAttachment(id, file);
      const list = await api.listAttachments(id);
      setAttachments(list);
      if (attachInputRef.current) {
        attachInputRef.current.value = "";
      }
    } catch {
      // Non-fatal
    }
  }

  if (loadError) {
    return (
      <div style={{ padding: 32 }}>
        <div className="error-banner">{loadError}</div>
        <button className="btn" onClick={() => navigate("/documents")}>Back to documents</button>
      </div>
    );
  }

  if (!doc) {
    return <div style={{ padding: 32 }}>Loading...</div>;
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
          <button className="btn btn-ghost" onClick={() => navigate("/documents")}>Back</button>
          <input type="text" value={title} onChange={(e) => { setTitle(e.target.value); titleRef.current = e.target.value; }} onBlur={handleTitleBlur} disabled={!doc.isOwner} style={{ fontSize: 16, fontWeight: 600, border: "none", background: "transparent", flex: 1 }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {saveStatus === "saving" && "Saving..."}
            {saveStatus === "saved" && "Saved"}
            {saveStatus === "error" && "Save failed"}
          </span>
          {!doc.isOwner && (
            <span style={{ fontSize: 12, background: "var(--accent-soft)", color: "var(--accent)", padding: "3px 8px", borderRadius: 6 }}>Shared by {doc.owner.name}</span>
          )}
          {doc.isOwner && (
            <button className="btn" onClick={() => setShowShare(true)}>Share</button>
          )}
        </div>
      </header>

      <div style={{ flex: 1, display: "flex", justifyContent: "center", background: "var(--bg)" }}>
        <div style={{ width: "100%", maxWidth: 760, padding: "24px 0 80px" }}>
          <div className="card" style={{ overflow: "hidden" }}>
            <EditorToolbar editor={editor} />
            <div style={{ padding: "24px 32px", minHeight: 400 }}>
              <EditorContent editor={editor} />
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>ATTACHMENTS</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
              {attachments.map((a) => (
                <a key={a.id} href={"/api/attachments/" + a.id + "/download"} style={{ fontSize: 13, color: "var(--accent)" }}>
                  {a.originalName}
                </a>
              ))}
              {attachments.length === 0 && (
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>No attachments yet.</span>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input ref={attachInputRef} type="file" style={{ fontSize: 12 }} />
              <button className="btn" style={{ fontSize: 12 }} onClick={handleAttach}>Attach file</button>
            </div>
          </div>
        </div>
      </div>

      {showShare && doc.isOwner && (
        <ShareModal doc={doc} onClose={() => setShowShare(false)} onUpdated={setDoc} />
      )}
    </div>
  );
}