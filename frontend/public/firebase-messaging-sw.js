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

const STATIC_CACHE_NAME = "bloodbridge-shell-v1";
const STATIC_PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/bloodbridge-icon-192.png",
  "/bloodbridge-icon-512.png",
  "/bloodbridge-icon-maskable.png",
  "/bloodbridge-logo.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_PRECACHE_URLS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Secure fetch handler: NEVER cache /api/ calls or sensitive endpoints
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. Only handle GET requests; pass through POST/PUT/PATCH/DELETE
  if (req.method !== "GET") {
    return;
  }

  // 2. Strictly bypass cache for API routes, auth, websockets, and Firebase SDK calls
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/health") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("firebase") ||
    url.hostname.includes("identitytoolkit")
  ) {
    return;
  }

  // 3. Navigation requests: Network-first, fallback to cached index.html
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("/index.html").then((res) => res || caches.match("/")))
    );
    return;
  }

  // 4. Static assets (JS, CSS, images, fonts, manifest)
  const isStaticAsset =
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|webp|ico|woff2?|json)$/) ||
    url.origin === self.location.origin;

  if (isStaticAsset) {
    event.respondWith(
      caches.match(req).then((cachedResponse) => {
        if (cachedResponse) {
          // Fetch updated version in background for next time (stale-while-revalidate)
          fetch(req)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(STATIC_CACHE_NAME).then((cache) => cache.put(req, networkResponse));
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        return fetch(req)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const resClone = networkResponse.clone();
              caches.open(STATIC_CACHE_NAME).then((cache) => cache.put(req, resClone));
            }
            return networkResponse;
          })
          .catch(() => {
            // If offline and request is an image, fallback gracefully
            return caches.match("/bloodbridge-logo.png");
          });
      })
    );
  }
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
