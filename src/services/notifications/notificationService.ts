import {
  doc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { type Notification, type NotificationStatus } from "../../models/notification";
import { getNotificationsCollection } from "../../lib/collections";

/**
 * Helper to safely map a Firestore document to our Notification model.
 * Converts Firestore Timestamps to ISO strings.
 */
const mapToNotification = (docSnap: QueryDocumentSnapshot<DocumentData>): Notification => {
  const data = docSnap.data();
  
  let firedAtStr = "";
  if (data.firedAt) {
    firedAtStr = typeof data.firedAt.toDate === "function"
      ? data.firedAt.toDate().toISOString()
      : new Date(data.firedAt).toISOString();
  }

  return {
    id: docSnap.id, // Notification doc ID (e.g. reminderId_timeSlot)
    reminderId: data.reminderId || "",
    title: data.title || "",
    description: data.description || "",
    firedAt: firedAtStr,
    status: (data.status as NotificationStatus) || "sent",
  };
};

export const notificationService = {
  /**
   * Fetches the most recent notifications for a given profile.
   */
  getNotifications: async (userId: string, profileId: string, limitCount: number = 50): Promise<Notification[]> => {
    const notificationsRef = getNotificationsCollection(userId, profileId);
    
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const q = query(
      notificationsRef,
      where("firedAt", ">=", startOfToday),
      orderBy("firedAt", "desc"),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(mapToNotification);
  },

  /**
   * Updates the status of a specific notification (e.g., to "acknowledged" or "dismissed").
   */
  updateNotificationStatus: async (userId: string, profileId: string, notificationId: string, status: NotificationStatus): Promise<void> => {
    const notificationDocRef = doc(getNotificationsCollection(userId, profileId), notificationId);
    await updateDoc(notificationDocRef, { status });
  },

  /**
   * Deletes a specific notification from history.
   */
  deleteNotification: async (userId: string, profileId: string, notificationId: string): Promise<void> => {
    const notificationDocRef = doc(getNotificationsCollection(userId, profileId), notificationId);
    await deleteDoc(notificationDocRef);
  }
};