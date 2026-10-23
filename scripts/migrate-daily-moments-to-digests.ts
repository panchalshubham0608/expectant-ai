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
const keepSource = process.argv.includes("--keep-source");

async function migrateDailyMomentsToDigests() {
  console.log("Starting migration from dailyMoments to dailyDigests...");

  if (isDryRun) {
    console.log("⚠️ DRY RUN MODE ENABLED. No data will be written or deleted.");
  }
  if (keepSource) {
    console.log("ℹ️ --keep-source flag detected. Old dailyMoments documents will not be deleted after copying.");
  }

  const usersSnapshot = await db.collection("users").get();
  console.log(`${usersSnapshot.docs.length} users found.`);

  let totalMigrated = 0;
  let totalDeleted = 0;

  for (const userDoc of usersSnapshot.docs) {
    const profilesSnapshot = await db
      .collection("users")
      .doc(userDoc.id)
      .collection("profiles")
      .get();

    for (const profileDoc of profilesSnapshot.docs) {
      const profileRef = db
        .collection("users")
        .doc(userDoc.id)
        .collection("profiles")
        .doc(profileDoc.id);

      const momentsRef = profileRef.collection("dailyMoments");
      const digestsRef = profileRef.collection("dailyDigests");

      const momentsSnapshot = await momentsRef.get();

      if (momentsSnapshot.empty) {
        continue;
      }

      if (!isDryRun) {
        const batch = db.batch();

        momentsSnapshot.docs.forEach((momentDoc) => {
          const data = momentDoc.data();
          const targetRef = digestsRef.doc(momentDoc.id);

          batch.set(
            targetRef,
            {
              ...data,
              babyNames: Array.isArray(data.babyNames) ? data.babyNames : [],
            },
            { merge: true }
          );

          if (!keepSource) {
            batch.delete(momentDoc.ref);
          }
        });

        await batch.commit();
        console.log(
          `Migrated ${momentsSnapshot.size} document(s)${keepSource ? "" : " and removed source documents"} for user ${userDoc.id}, profile ${profileDoc.id}`
        );
      } else {
        console.log(
          `[DRY RUN] Would migrate ${momentsSnapshot.size} document(s)${keepSource ? "" : " and delete source documents"} for user ${userDoc.id}, profile ${profileDoc.id}`
        );
      }

      totalMigrated += momentsSnapshot.size;
      if (!keepSource) {
        totalDeleted += momentsSnapshot.size;
      }
    }
  }

  console.log(
    `Migration complete. Total documents ${isDryRun ? "that would be " : ""}migrated: ${totalMigrated}, source documents ${isDryRun ? "that would be " : ""}deleted: ${totalDeleted}`
  );
}

migrateDailyMomentsToDigests().catch((error) => {
  console.error("Error during migration:", error);
  process.exit(1);
});
