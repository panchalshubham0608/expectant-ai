export interface ConversationMessage {
  id: string;
  role:
    | "user"
    | "assistant"
    | "system";
  content: string;
  timestamp: string;
  observationIds: string[];
}
