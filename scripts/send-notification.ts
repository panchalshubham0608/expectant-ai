import { cert, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

function getServiceAccount() {
  const value = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!value) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT environment variable is not set."
    );
  }

  try {
    return JSON.parse(value);
  } catch {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT is not valid JSON."
    );
  }
}

function initializeFirebase() {
  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (!projectId) {
    throw new Error(
      "FIREBASE_PROJECT_ID environment variable is not set."
    );
  }

  const serviceAccount = getServiceAccount();

  initializeApp({
    credential: cert(serviceAccount),
    projectId,
  });
}

async function sendNotification() {
  const fid = process.env.FCM_INSTALLATION_ID;

  if (!fid) {
    throw new Error(
      "FCM_INSTALLATION_ID environment variable is not set."
    );
  }

  const messaging = getMessaging();

  const message = {
    fid,
    data: {
      title: "Expectant AI",
      message: "This is your 30-minute test notification.",
      url: "/expectant-ai/",
    },
  };

  console.log("Sending notification...");

  const messageId = await messaging.send(message);

  console.log("Notification sent successfully.");
  console.log(`FCM message ID: ${messageId}`);
}

async function main() {
  try {
    initializeFirebase();
    await sendNotification();
  } catch (error) {
    console.error("Failed to send notification:");

    if (error instanceof Error) {
      console.error(error.message);
      console.error(error.stack);
    } else {
      console.error(error);
    }

    process.exit(1);
  }
}

main();
