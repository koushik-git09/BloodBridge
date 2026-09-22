/* eslint-disable no-restricted-globals */
// BloodBridge Service Worker & Background FCM Push Handler

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Native push listener for robust cross-browser background notification handling
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch (e) {
    try {
      payload = { notification: { title: "BloodBridge Alert", body: event.data.text() } };
    } catch {
      payload = { notification: { title: "BloodBridge Alert", body: "New urgent notification received." } };
    }
  }

  const notification = payload.notification || {};
  const data = payload.data || {};

  const title = notification.title || data.title || "BloodBridge Emergency Alert";
  const body = notification.body || data.body || data.message || "An urgent blood network alert requires your attention.";
  const isEmergency = data.urgency === "CRITICAL" || data.urgency === "URGENT" || data.type === "EMERGENCY_BLOOD_REQUEST";

  // Determine navigation URL
  let targetUrl = "/";
  if (data.type === "BLOOD_REQUEST" || data.notification_type === "BLOOD_REQUEST") {
    targetUrl = "/blood-bank";
  } else if (data.type === "DONOR_ACCEPTED" || data.type === "HOSPITAL_ALERT") {
    targetUrl = "/hospital";
  } else if (data.type === "EMERGENCY_BLOOD_REQUEST" || data.type === "DONATION_COMPLETED") {
    targetUrl = "/donor";
  }

  const options = {
    body,
    icon: "/bloodbridge-logo.png",
    badge: "/bloodbridge-logo.png",
    tag: data.request_id ? `bb-${data.request_id}` : `bb-${Date.now()}`,
    renotify: true,
    requireInteraction: isEmergency,
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
