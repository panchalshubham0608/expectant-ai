import admin from "firebase-admin";

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error("FIREBASE_SERVICE_ACCOUNT is not set");
  process.exit(1);
}
const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
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
