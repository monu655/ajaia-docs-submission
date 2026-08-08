export interface UserSummary {
  id: string;
  name: string;
  email: string;
}

export interface DocSummary {
  id: string;
  title: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocDetail extends DocSummary {
  content: string;
  owner: UserSummary;
  sharedWith: UserSummary[];
  isOwner: boolean;
}

export interface DocumentsList {
  owned: DocSummary[];
  shared: DocSummary[];
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function getCurrentUserId(): string | null {
  return localStorage.getItem("ajaia_user_id");
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const userId = getCurrentUserId();
  const headers: Record<string, string> = {
    ...(init.body && !(init.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : {}),
    ...(userId ? { "x-user-id": userId } : {}),
    ...(init.headers as Record<string, string>),
  };
  const res = await fetch(`/api${path}`, { ...init, headers });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore — fall back to statusText
    }
    throw new ApiError(message, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  listUsers: () => request<UserSummary[]>("/users"),
  listDocuments: () => request<DocumentsList>("/documents"),
  getDocument: (id: string) => request<DocDetail>(`/documents/${id}`),
  createDocument: (title: string) =>
    request<DocDetail>("/documents", {
      method: "POST",
      body: JSON.stringify({ title }),
    }),
  updateDocument: (id: string, patch: { title?: string; content?: string }) =>
    request<DocDetail>(`/documents/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    }),
  deleteDocument: (id: string) =>
    request<void>(`/documents/${id}`, { method: "DELETE" }),
  shareDocument: (id: string, userId: string) =>
    request<DocDetail>(`/documents/${id}/share`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),
  unshareDocument: (id: string, userId: string) =>
    request<DocDetail>(`/documents/${id}/share/${userId}`, {
      method: "DELETE",
    }),
  importDocument: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<DocDetail>("/documents/import", {
      method: "POST",
      body: form,
    });
  },
  listAttachments: (docId: string) =>
    request<{ id: string; originalName: string; uploadedAt: string }[]>(
      `/documents/${docId}/attachments`
    ),
  uploadAttachment: (docId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<{ id: string; originalName: string }>(
      `/documents/${docId}/attachments`,
      { method: "POST", body: form }
    );
  },
};

export { ApiError, getCurrentUserId };
