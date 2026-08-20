import {
    getMessaging,
    onRegistered,
    register,
} from "firebase/messaging";

import { app } from "./firebase";
import {
    savePushSubscription,
} from "../services/pushSubscriptions/pushSubscriptionsService";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export async function registerForNotifications(
    userId: string,
): Promise<string | null> {
    console.log("[FCM] Starting notification registration...");
    if (app == null) {
        console.warn("[FCM] Firebase is not configured.");
        return null;
    }

    if (!("Notification" in window)) {
        console.warn("[FCM] Notifications are not supported.");
        return null;
    }

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
        console.warn("[FCM] Notification permission was not granted.");
        return null;
    }

    const { isSupported } = await import("firebase/messaging");

    const supported = await isSupported();

    if (!supported) {
        console.warn("[FCM] Firebase Messaging is not supported.");
        return null;
    }

    const serviceWorkerUrl =
        "/expectant-ai/firebase-messaging-sw.js";
    console.log(
        "[FCM] Registering service worker:",
        serviceWorkerUrl
    );

    const registration = await navigator.serviceWorker.register(serviceWorkerUrl);

    const messaging = getMessaging(app);

    return new Promise((resolve, reject) => {
        console.log("[FCM] Installing onRegistered callback...");
        onRegistered(messaging, (installationId) => {
            console.log(
                "Firebase Installation ID:",
                installationId
            );

            savePushSubscription(
                userId,
                installationId
            ).then(() => {
                console.log(
                    "[FCM] Push subscription saved to Firestore."
                );
            }).catch((err) => {
                console.error(
                    "[FCM] Failed to save push subscription to Firestore:",
                    err
                );
            });

            resolve(installationId);
        });

        register(messaging, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration,
        }).then(() => {
            console.log(
                "[FCM] register() completed successfully."
            );
        }).catch((error) => {
            console.error(
                "[FCM] register() failed:",
                error
            );

            reject(error);
        });
    });
}