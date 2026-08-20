export type NotificationStatus = "sent" | "acknowledged" | "dismissed";

export interface Notification {
  id: string;
  reminderId: string;
  title: string;
  description: string;
  firedAt: string;
  status: NotificationStatus;
}