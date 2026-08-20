import * as admin from "firebase-admin";
import { initializeApp, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { FieldValue } from "firebase-admin/firestore";
import { getActiveReminders } from "./get-active-reminders";
import { type Notification } from "../src/models/notification";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing required Firebase credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.");
  process.exit(1);
}

initializeApp({
  credential: admin.cert({
    projectId,
    clientEmail,
    privateKey: privateKey.includes("\\n") ? privateKey.replace(/\\n/g, "\n") : privateKey,
  }),
  projectId,
});

const app = getApp();
const db = getFirestore(app);
const messaging = getMessaging(app);

function getISTTimeStr(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

async function sendNotifications() {
  console.log("Sending notifications...")
  const usersSnapshot = await db.collection("users").get();
  console.log(usersSnapshot.docs.length + " users found");

  for (const userDoc of usersSnapshot.docs) {
    const subscriptionsSnapshot = await db
      .collection("users")
      .doc(userDoc.id)
      .collection("pushSubscriptions")
      .get();
    console.log(`Found ${subscriptionsSnapshot.size} subscriptions for user ${userDoc.id}`);

    const fids = subscriptionsSnapshot.docs.map(doc => doc.data().installationId);

    if (fids.length === 0) {
      continue;
    }

    console.log(
      `Sending notification to ${fids.length} device(s) for user ${userDoc.id}`
    );

    const profilesSnapshot = await db
      .collection("users")
      .doc(userDoc.id)
      .collection("profiles")
      .get();

    for (const profileDoc of profilesSnapshot.docs) {
      const now = new Date();
      const thirtyMinutesBefore = new Date(now.getTime() - 30 * 60 * 1000);
      const thirtyMinutesAfter = new Date(now.getTime() + 30 * 60 * 1000);
      const startTimeStr = getISTTimeStr(thirtyMinutesBefore);
      const endTimeStr = getISTTimeStr(thirtyMinutesAfter);
      
      // fetch last time of notification capture
      const remindersToFire = await getActiveReminders(
        db,
        userDoc.id,
        profileDoc.id,
        startTimeStr,
        endTimeStr
      );

      console.log(`Found ${remindersToFire.length} reminders to fire for user ${userDoc.id}`);
      for (const reminder of remindersToFire) {
        if (!reminder.title || !reminder.description || !reminder.fireTimeMinutes) continue;
        const notificationDocId = `${reminder.id}_${reminder.fireTimeMinutes};`
        const notificationsRef = db
          .collection("users")
          .doc(userDoc.id)
          .collection("profiles")
          .doc(profileDoc.id)
          .collection("notifications");

        // Generate a deterministic document ID for this specific reminder and time slot
        const notificationDocRef = notificationsRef.doc(notificationDocId);
        const notificationDocSnap = await notificationDocRef.get();

        if (notificationDocSnap.exists) {
          console.log(`Notification for reminder ${reminder.id} already fired for time ${reminder.fireTimeMinutes}. Skipping.`);
          continue;
        }

        const message = {
          data: {
            id: notificationDocId,
            reminderId: reminder.id,
            title: reminder.title,
            message: reminder.description,
            url: `/expectant-ai/`,
          },
          fids,
        };

        try {
          const response =
            await messaging.sendEachForMulticast(message);

          console.log(
            `Success: ${response.successCount}, ` +
            `Failure: ${response.failureCount}`
          );

          // Record the notification to prevent it from firing again
          if (response.successCount > 0) {
            const notification = {
              id: notificationDocId,
              reminderId: reminder.id,
              title: reminder.title,
              description: reminder.description,
              firedAt: FieldValue.serverTimestamp(),
              status: 'sent',
            } as unknown as Notification;
            await notificationDocRef.set(notification);
          }
        } catch (error) {
          console.error(
            `Failed for user ${userDoc.id}:`,
            error
          );
        }
      }

    }
  }
}

sendNotifications().catch((error) => {
  console.error(error);
  process.exit(1);
});
