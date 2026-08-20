/* global firebase */

importScripts(
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyAzqQrMgSrb7GWmQpfHkgnTwqxCR_qKA5w",
  authDomain: "expectant-ai.firebaseapp.com",
  projectId: "expectant-ai",
  storageBucket: "expectant-ai.firebasestorage.app",
  messagingSenderId: "707884032173",
  appId: "1:707884032173:web:0de5e139bbb36e82e2a624",
});

const messaging = firebase.messaging();
const iconUrl = "/expectant-ai/expectant-ai.png";

self.addEventListener("install", () => {
  console.log("[firebase-messaging-sw.js] Installing new version");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[firebase-messaging-sw.js] Activating new version");

  event.waitUntil(
    clients.claim()
  );
});

messaging.onBackgroundMessage((payload) => {
  try {
    console.log("[firebase-messaging-sw.js] Background message:", payload);

    const title = payload.data?.title ?? "Expectant AI";
    const message = payload.data?.message ?? "You have a new notification.";
    const options = {
      body: message,
      icon: iconUrl,
      badge: iconUrl,
      requireInteraction: true,
      data: {
        url: payload.data?.url ?? "/expectant-ai/",
      },
      tag: `expectant-ai-notification-${payload.data?.id ?? "default"}`
    };

    return self.registration.showNotification(title, options)
      .then(() => {
        console.log("[firebase-messaging-sw.js] Notification successfully handed off to browser.");
      })
      .catch((err) => {
        console.error("[firebase-messaging-sw.js] Failed to show notification:", err);
      });
  } catch (error) {
    console.error("[firebase-messaging-sw.js] Execution error in onBackgroundMessage:", error);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url =
    event.notification.data?.url ??
    "/expectant-ai/";

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
