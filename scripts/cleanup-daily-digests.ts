import * as admin from "firebase-admin";
import { initializeApp, getApp } from "firebase-admin/app";
import { FieldValue, getFirestore, type DocumentData, type DocumentReference } from "firebase-admin/firestore";

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
const PUZZLE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_BATCH_OPS = 450;

type BatchOp =
  | { type: "delete"; ref: DocumentReference }
  | { type: "deleteMindPuzzles"; ref: DocumentReference };

const extractEpochMs = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as { toMillis?: unknown }).toMillis === "function"
  ) {
    const ms = (value as { toMillis: () => number }).toMillis();
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const parseEndOfDateUtcMs = (dateStr: unknown): number | null => {
  if (typeof dateStr !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return null;
  }
  const [y, m, d] = dateStr.split("-").map((part) => Number.parseInt(part, 10));
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) {
    return null;
  }
  return Date.UTC(y, m - 1, d, 23, 59, 59, 999);
};

const getMindPuzzlesTimestampMs = (data: DocumentData): number | null => {
  const mindPuzzles = data.mindPuzzles;
  if (mindPuzzles && typeof mindPuzzles === "object") {
    const updatedAt = extractEpochMs((mindPuzzles as Record<string, unknown>).updatedAt);
    if (updatedAt !== null) return updatedAt;
  }

  const createdAt = extractEpochMs(data.createdAt);
  if (createdAt !== null) return createdAt;

  return parseEndOfDateUtcMs(data.date);
};

const hasOtherDigestContent = (data: DocumentData): boolean =>
  Boolean(
    data.card ||
      data.header ||
      (Array.isArray(data.babyNames) && data.babyNames.length > 0) ||
      data.spiritualSloka ||
      data.babyTalk
  );

const commitBatchOps = async (ops: BatchOp[]): Promise<void> => {
  for (let i = 0; i < ops.length; i += MAX_BATCH_OPS) {
    const chunk = ops.slice(i, i + MAX_BATCH_OPS);
    const batch = db.batch();
    for (const op of chunk) {
      if (op.type === "delete") {
        batch.delete(op.ref);
      } else {
        batch.update(op.ref, { mindPuzzles: FieldValue.delete() });
      }
    }
    await batch.commit();
  }
};

async function cleanupDailyDigests() {
  console.log("Starting daily digests & expired puzzles cleanup...");

  if (isDryRun) {
    console.log("⚠️ DRY RUN MODE ENABLED. No data will actually be deleted.");
  }

  const nowMs = Date.now();
  const puzzleCutoffMs = nowMs - PUZZLE_MAX_AGE_MS;

  // Calculate the digest cutoff date (30 days ago) in YYYY-MM-DD format
  const thirtyDaysAgo = new Date(nowMs);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const year = thirtyDaysAgo.getFullYear();
  const month = String(thirtyDaysAgo.getMonth() + 1).padStart(2, "0");
  const day = String(thirtyDaysAgo.getDate()).padStart(2, "0");
  const cutoffDate = `${year}-${month}-${day}`;

  console.log(`Deleting all daily digests older than: ${cutoffDate}`);
  console.log(
    `Pruning mindPuzzles older than 24h (before ${new Date(puzzleCutoffMs).toISOString()})`
  );

  const usersSnapshot = await db.collection("users").get();
  console.log(`${usersSnapshot.docs.length} users found.`);
  let totalDigestsDeleted = 0;
  let totalPuzzlesPruned = 0;

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

      const ops: BatchOp[] = [];
      let profileDigestsDeleted = 0;
      let profilePuzzlesPruned = 0;

      // 1. Delete entire daily digests older than 30 days
      const oldDigestsSnapshot = await digestsRef.where("date", "<", cutoffDate).get();
      for (const digestDoc of oldDigestsSnapshot.docs) {
        ops.push({ type: "delete", ref: digestDoc.ref });
        profileDigestsDeleted += 1;
      }

      // 2. For recent digests (within 30 days), prune mindPuzzles older than 24h
      const recentDigestsSnapshot = await digestsRef.where("date", ">=", cutoffDate).get();
      for (const digestDoc of recentDigestsSnapshot.docs) {
        const data = digestDoc.data();
        if (data.mindPuzzles === undefined || data.mindPuzzles === null) {
          continue;
        }

        // Preserve puzzles for today's or pre-generated future digests
        const digestEndOfDayUtcMs = parseEndOfDateUtcMs(data.date);
        if (digestEndOfDayUtcMs !== null && digestEndOfDayUtcMs >= nowMs) {
          continue;
        }

        const puzzleTimestampMs = getMindPuzzlesTimestampMs(data);
        if (puzzleTimestampMs !== null && puzzleTimestampMs < puzzleCutoffMs) {
          if (hasOtherDigestContent(data)) {
            ops.push({ type: "deleteMindPuzzles", ref: digestDoc.ref });
          } else {
            // Digest shell was created solely for mindPuzzles; delete the empty doc
            ops.push({ type: "delete", ref: digestDoc.ref });
          }
          profilePuzzlesPruned += 1;
        }
      }

      if (ops.length > 0) {
        if (!isDryRun) {
          await commitBatchOps(ops);
          console.log(
            `User ${userDoc.id}, profile ${profileDoc.id}: deleted ${profileDigestsDeleted} old digests, pruned ${profilePuzzlesPruned} expired puzzle sets`
          );
        } else {
          console.log(
            `[DRY RUN] User ${userDoc.id}, profile ${profileDoc.id}: would delete ${profileDigestsDeleted} old digests and prune ${profilePuzzlesPruned} expired puzzle sets`
          );
        }
        totalDigestsDeleted += profileDigestsDeleted;
        totalPuzzlesPruned += profilePuzzlesPruned;
      }
    }
  }

  console.log(
    `Cleanup complete. Total digests ${isDryRun ? "that would be " : ""}deleted: ${totalDigestsDeleted}; expired puzzle sets ${isDryRun ? "that would be " : ""}pruned: ${totalPuzzlesPruned}`
  );
}

cleanupDailyDigests().catch((error) => {
  console.error("Error during cleanup:", error);
  process.exit(1);
});
