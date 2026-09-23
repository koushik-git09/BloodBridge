import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
  type Messaging,
  type MessagePayload,
} from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let messagingPromise: Promise<Messaging | null> | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (app) return app;
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.warn("[FCM] Firebase Web configuration is missing in frontend/.env.local");
    return null;
  }
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  return app;
}

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (messagingPromise) return messagingPromise;

  messagingPromise = (async () => {
    const supported = await isSupported().catch(() => false);
    if (!supported) {
      console.warn("[FCM] Firebase Messaging is not supported in this browser environment.");
      return null;
    }
    const firebaseApp = getFirebaseApp();
    if (!firebaseApp) return null;
    return getMessaging(firebaseApp);
  })();

  return messagingPromise;
}

export async function requestNotificationPermissionAndToken(): Promise<string | null> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    console.warn("[FCM] Browser does not support HTML5 notifications.");
    return null;
  }

  // If already explicitly denied, do not prompt repeatedly
  if (Notification.permission === "denied") {
    console.warn("[FCM] Notification permission was previously denied by user.");
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    console.log("[FCM] User dismissed or denied notification permission.");
    return null;
  }

  const messaging = await getFirebaseMessaging();
  if (!messaging) return null;

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

  try {
    let swRegistration: ServiceWorkerRegistration | undefined;
    if ("serviceWorker" in navigator) {
      swRegistration =
        (await navigator.serviceWorker.getRegistration("/")) ||
        (await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
          scope: "/",
        }));
      await navigator.serviceWorker.ready;
    }

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swRegistration,
    });

    if (token) {
      console.log("[FCM] Successfully acquired device token:", token.substring(0, 10) + "...");
      return token;
    }
  } catch (error) {
    console.error("[FCM] Error acquiring FCM device token:", error);
  }

  return null;
}

export function onForegroundMessage(
  callback: (payload: MessagePayload) => void
): (() => void) | null {
  let unsubscribe: (() => void) | null = null;

  getFirebaseMessaging().then((messaging) => {
    if (messaging) {
      unsubscribe = onMessage(messaging, (payload) => {
        console.log("[FCM] Foreground push received:", payload);
        callback(payload);
      });
    }
  });

  return () => {
    if (unsubscribe) unsubscribe();
  };
}
