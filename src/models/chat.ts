export type ChatAttachmentSource = 'camera' | 'gallery' | 'document';

export interface ChatAttachmentMeta {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  source: ChatAttachmentSource;
  previewDataUrl?: string;
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
