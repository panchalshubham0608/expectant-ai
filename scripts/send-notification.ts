import admin from "firebase-admin";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
    console.error("Missing required Firebase credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.");
    process.exit(1);
}

const key = privateKey.includes("\\n") ? privateKey.replace(/\\n/g, "\n") : privateKey;
admin.initializeApp({
    credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: key,
    }),
});

const db = admin.firestore();
const messaging = admin.messaging();

async function sendNotifications() {
  const usersSnapshot = await db.collection("users").get();

  for (const userDoc of usersSnapshot.docs) {
    const subscriptionsSnapshot = await db
      .collection("users")
      .doc(userDoc.id)
      .collection("pushSubscriptions")
      .get();

    const fids = subscriptionsSnapshot.docs.map(doc => doc.data().installationId);

    if (fids.length === 0) {
      continue;
    }

    console.log(
      `Sending notification to ${fids.length} device(s) for user ${userDoc.id}`
    );

    const message = {
      data: {
        title: "Expectant AI",
        message: "This is your 30-minute test notification.",
        url: "/expectant-ai/",
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
    } catch (error) {
      console.error(
        `Failed for user ${userDoc.id}:`,
        error
      );
    }
  }
}

sendNotifications().catch((error) => {
  console.error(error);
  process.exit(1);
});
