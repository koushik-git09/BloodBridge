/* eslint-disable no-restricted-globals */
// BloodBridge Service Worker & Background FCM Push Handler

try {
  importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js");
  importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js");

  // Initialize Firebase in Service Worker for Android Chrome background wake-up
  firebase.initializeApp({
    apiKey: "AIzaSyCoENtK3Bd2DHdK8LqXH9vqzGCS5OehrDY",
    authDomain: "bloodbridge-40623.firebaseapp.com",
    projectId: "bloodbridge-40623",
    storageBucket: "bloodbridge-40623.firebasestorage.app",
    messagingSenderId: "1086509203075",
    appId: "1:1086509203075:web:d14398b1255f664b5ce5b6",
  });

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log("[SW] Firebase onBackgroundMessage received:", payload);
    const notif = payload.notification || {};
    const data = payload.data || {};

    const title = notif.title || data.title || "🚨 BloodBridge Emergency Alert";
    const body =
      notif.body ||
      data.body ||
      data.message ||
      "An urgent blood network alert requires your immediate attention.";

    let targetUrl = "/";
    const type = data.type || data.notification_type || "";
    if (type === "BLOOD_REQUEST" || type === "RESERVATION_ALERT") {
      targetUrl = "/blood-bank";
    } else if (
      type === "DONOR_ACCEPTED" ||
      type === "BLOOD_BANK_RESPONSE" ||
      type === "HOSPITAL_ALERT"
    ) {
      targetUrl = "/hospital";
    } else if (
      type === "EMERGENCY_BLOOD_REQUEST" ||
      type === "DONATION_COMPLETED" ||
      type.includes("donor")
    ) {
      targetUrl = "/donor";
    }

    const tag = data.request_id ? `bb-${data.request_id}` : `bb-${Date.now()}`;

    return self.registration.showNotification(title, {
      body,
      icon: "/bloodbridge-logo.png",
      badge: "/bloodbridge-logo.png",
      tag,
      renotify: true,
      requireInteraction: true,
      vibrate: [300, 150, 300, 150, 500],
      data: {
        ...data,
        url: data.url || targetUrl,
        timestamp: Date.now(),
      },
      actions: [
        {
          action: "open",
          title: "View Alert",
        },
      ],
    });
  });
} catch (e) {
  console.warn("[SW] Firebase background compat setup note:", e);
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Native push listener for robust cross-browser and killed-browser mobile push delivery
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch (e) {
    try {
      payload = { notification: { title: "🚨 BloodBridge Alert", body: event.data.text() } };
    } catch {
      payload = {
        notification: {
          title: "🚨 BloodBridge Alert",
          body: "New urgent blood network alert received.",
        },
      };
    }
  }

  let notification = payload.notification || {};
  let data = payload.data || {};

  // Check if payload is wrapped inside data.FCM_MSG (standard in Firebase Web Push)
  if (data.FCM_MSG) {
    try {
      const fcmMsg =
        typeof data.FCM_MSG === "string" ? JSON.parse(data.FCM_MSG) : data.FCM_MSG;
      if (fcmMsg.notification) notification = { ...notification, ...fcmMsg.notification };
      if (fcmMsg.data) data = { ...data, ...fcmMsg.data };
    } catch (err) {
      // ignore JSON parse error
    }
  }

  const title =
    notification.title ||
    data.title ||
    (data.type === "BLOOD_BANK_RESPONSE" ? "Blood Bank Responded" : "🚨 BloodBridge Emergency Alert");
  const body =
    notification.body ||
    data.body ||
    data.message ||
    "An urgent blood network alert requires your attention.";
  const isEmergency =
    data.urgency === "CRITICAL" ||
    data.urgency === "URGENT" ||
    data.urgency === "high" ||
    data.type === "EMERGENCY_BLOOD_REQUEST";

  // Determine navigation URL
  let targetUrl = "/";
  const type = data.type || data.notification_type || "";
  if (type === "BLOOD_REQUEST" || type === "RESERVATION_ALERT") {
    targetUrl = "/blood-bank";
  } else if (
    type === "DONOR_ACCEPTED" ||
    type === "BLOOD_BANK_RESPONSE" ||
    type === "HOSPITAL_ALERT"
  ) {
    targetUrl = "/hospital";
  } else if (
    type === "EMERGENCY_BLOOD_REQUEST" ||
    type === "DONATION_COMPLETED" ||
    type.includes("donor")
  ) {
    targetUrl = "/donor";
  }

  const options = {
    body,
    icon: "/bloodbridge-logo.png",
    badge: "/bloodbridge-logo.png",
    tag: data.request_id ? `bb-${data.request_id}` : `bb-${Date.now()}`,
    renotify: true,
    requireInteraction: true,
    vibrate: isEmergency ? [300, 150, 300, 150, 500] : [200, 100, 200],
    data: {
      ...data,
      url: data.url || targetUrl,
      timestamp: Date.now(),
    },
    actions: [
      {
        action: "open",
        title: "Open BloodBridge",
      },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Click listener to navigate to the relevant dashboard or request
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If a tab is already open, focus it and navigate
      for (const client of clientList) {
        if ("focus" in client) {
          if (client.url.includes(self.location.origin)) {
            client.focus();
            if ("navigate" in client && targetUrl) {
              client.navigate(targetUrl);
            }
            return;
          }
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
