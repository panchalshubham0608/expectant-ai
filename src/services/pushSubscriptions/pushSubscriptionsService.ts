import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getPushSubscriptionsCollection } from "../../lib/collections";

export async function savePushSubscription(
    userId: string,
    installationId: string
): Promise<void> {
    const subscriptionRef = doc(
        getPushSubscriptionsCollection(userId),
        installationId
    );

    await setDoc(
        subscriptionRef,
        {
            installationId,
            updatedAt: serverTimestamp(),
        },
        { merge: true }
    );
}