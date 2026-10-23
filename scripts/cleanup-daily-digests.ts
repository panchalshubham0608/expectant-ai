import * as admin from "firebase-admin";
import { initializeApp, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing required Firebase credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.");
  process.exit(1);
}

// Initialize Firebase Admin
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

const isDryRun = process.argv.includes("--dry-run");

async function cleanupDailyDigests() {
  console.log("Starting daily digests cleanup...");

  if (isDryRun) {
    console.log("⚠️ DRY RUN MODE ENABLED. No data will actually be deleted.");
  }

  // Calculate the cutoff date (30 days ago) in YYYY-MM-DD format
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const year = thirtyDaysAgo.getFullYear();
  const month = String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0');
  const day = String(thirtyDaysAgo.getDate()).padStart(2, '0');
  const cutoffDate = `${year}-${month}-${day}`;

  console.log(`Deleting all daily digests older than: ${cutoffDate}`);

  const usersSnapshot = await db.collection("users").get();
  console.log(`${usersSnapshot.docs.length} users found.`);
  let totalDeleted = 0;

  for (const userDoc of usersSnapshot.docs) {
    const profilesSnapshot = await db
      .collection("users")
      .doc(userDoc.id)
      .collection("profiles")
      .get();

    for (const profileDoc of profilesSnapshot.docs) {
      const digestsRef = db
        .collection("users")
        .doc(userDoc.id)
        .collection("profiles")
        .doc(profileDoc.id)
        .collection("dailyDigests");

      // Query for digests where the date string is older than the cutoff
      const oldDigestsSnapshot = await digestsRef.where("date", "<", cutoffDate).get();

      if (!oldDigestsSnapshot.empty) {
        if (!isDryRun) {
          const batch = db.batch();
          oldDigestsSnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
          });

          await batch.commit();
          console.log(`Deleted ${oldDigestsSnapshot.size} old digests for user ${userDoc.id}, profile ${profileDoc.id}`);
        } else {
          console.log(`[DRY RUN] Would delete ${oldDigestsSnapshot.size} old digests for user ${userDoc.id}, profile ${profileDoc.id}`);
        }
        totalDeleted += oldDigestsSnapshot.size;
      }
    }
  }

  console.log(`Cleanup complete. Total digests ${isDryRun ? "that would be " : ""}deleted: ${totalDeleted}`);
}

cleanupDailyDigests().catch((error) => {
  console.error("Error during cleanup:", error);
  process.exit(1);
});
