export type ChatAttachmentSource = 'camera' | 'gallery' | 'document';

export interface ChatAttachmentMeta {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  source: ChatAttachmentSource;
  url?: string;
  previewDataUrl?: string;
  fileDataUrl?: string;
  textPreview?: string;
}

export interface ConversationMessage {
  id: string;
  role:
    | "user"
    | "assistant"
    | "system";
  content: string;
  timestamp: string;
  observationIds: string[];
  attachments?: ChatAttachmentMeta[];
}
