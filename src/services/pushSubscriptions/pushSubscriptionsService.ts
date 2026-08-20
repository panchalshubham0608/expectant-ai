import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getPushSubscriptionsCollection } from "../../lib/collections";

export async function savePushSubscription(
    userId: string,
    profileId: string,
    installationId: string
): Promise<void> {
    const subscriptionRef = doc(
        getPushSubscriptionsCollection(userId, profileId),
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