export interface User {
  id: string;
  name: string;
  email: string;
}

export interface DocumentRow {
  id: string;
  title: string;
  content: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface ShareRow {
  document_id: string;
  user_id: string;
  permission: string;
}

export interface AttachmentRow {
  id: string;
  document_id: string;
  filename: string;
  original_name: string;
  uploaded_at: string;
}
