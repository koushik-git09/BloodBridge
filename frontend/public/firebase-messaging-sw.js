/* eslint-disable no-restricted-globals */
// BloodBridge Service Worker & Background FCM Push Handler

// Safely extract Firebase Web client configuration from service worker URL query params
const url = new URL(self.location.href);
const firebaseConfig = {
  apiKey: url.searchParams.get("apiKey"),
  authDomain: url.searchParams.get("authDomain"),
  projectId: url.searchParams.get("projectId"),
  storageBucket: url.searchParams.get("storageBucket"),
  messagingSenderId: url.searchParams.get("messagingSenderId"),
  appId: url.searchParams.get("appId"),
};

const hasValidConfig = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.messagingSenderId
);

let messaging = null;

if (hasValidConfig) {
  try {
    importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js");
    importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js");

    if (typeof firebase !== "undefined" && firebase.initializeApp) {
      firebase.initializeApp(firebaseConfig);
      messaging = firebase.messaging();
    }
  } catch (err) {
    console.warn("[SW] Firebase compat initialization note:", err && err.message);
  }
} else {
  console.warn("[SW] Firebase messaging configuration is incomplete.");
}

function getTargetUrl(data) {
  const type = (data.type || data.notification_type || "").toUpperCase();
  if (
    type === "BLOOD_REQUEST" ||
    type === "RESERVATION_ALERT" ||
    type.includes("BLOOD_BANK")
  ) {
    return "/dashboard/blood-bank";
  }
  if (
    type === "DONOR_ACCEPTED" ||
    type === "HOSPITAL_ALERT" ||
    type.includes("HOSPITAL")
  ) {
    return "/dashboard/hospital";
  }
  if (
    type === "EMERGENCY_BLOOD_REQUEST" ||
    type === "DONATION_COMPLETED" ||
    type.includes("DONOR")
  ) {
    return "/dashboard/donor";
  }
  return data.url || "/";
}

function buildNotificationOptions(title, body, data) {
  const isEmergency =
    data.urgency === "CRITICAL" ||
    data.urgency === "URGENT" ||
    data.urgency === "high" ||
    (data.type && data.type.includes("EMERGENCY"));

  const targetPath = getTargetUrl(data);
  const targetUrl = new URL(targetPath, self.location.origin).href;
  const tag =
    data.tag ||
    (data.request_id ? `bb-${data.request_id}` : `bb-alert-${data.type || "general"}`);

  return {
    title,
    options: {
      body,
      icon: "/bloodbridge-icon.png",
      badge: "/bloodbridge-badge.png",
      tag,
      renotify: true,
      requireInteraction: true,
      vibrate: isEmergency ? [300, 150, 300, 150, 500] : [200, 100, 200],
      data: {
        ...data,
        url: targetUrl,
        timestamp: Date.now(),
      },
      actions: [
        {
          action: "open",
          title: "Open BloodBridge",
        },
      ],
    },
  };
}

if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    const notif = payload.notification || {};
    const data = payload.data || {};
    const title = notif.title || data.title || "🚨 BloodBridge Emergency Alert";
    const body =
      notif.body ||
      data.body ||
      data.message ||
      "An urgent blood network alert requires your attention.";

    const { title: finalTitle, options } = buildNotificationOptions(title, body, data);
    return self.registration.showNotification(finalTitle, options);
  });
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Native push listener for robust background wake-up and deduplicated notification delivery
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
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

  // Check if payload is wrapped inside data.FCM_MSG
  if (data.FCM_MSG) {
    try {
      const fcmMsg =
        typeof data.FCM_MSG === "string" ? JSON.parse(data.FCM_MSG) : data.FCM_MSG;
      if (fcmMsg.notification) notification = { ...notification, ...fcmMsg.notification };
      if (fcmMsg.data) data = { ...data, ...fcmMsg.data };
    } catch {
      // ignore
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

  const { title: finalTitle, options } = buildNotificationOptions(title, body, data);
  event.waitUntil(self.registration.showNotification(finalTitle, options));
});

// Click listener to navigate to the correct dashboard URL
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const rawUrl = (event.notification.data && event.notification.data.url) || "/";
  const targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If a tab is already open on this origin, focus it and navigate
      for (const client of clientList) {
        if ("focus" in client && client.url.includes(self.location.origin)) {
          client.focus();
          if ("navigate" in client && targetUrl) {
            client.navigate(targetUrl);
          }
          return;
        }
      }
      // Otherwise open a new window with the target URL
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
