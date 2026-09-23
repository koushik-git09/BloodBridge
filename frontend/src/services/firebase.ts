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
    console.warn("[FCM] Firebase messaging configuration is incomplete.");
    return null;
  }
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  return app;
}

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (messagingPromise) return messagingPromise;

  messagingPromise = (async () => {
    const supported = await isSupported().catch(() => false);
    console.log(`[FCM] Firebase messaging supported: ${supported}`);
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

/**
 * Builds the service worker registration URL with public client config query params
 * so the background service worker can initialize Firebase without hardcoded keys.
 */
export function getServiceWorkerUrl(): string {
  const queryParams = new URLSearchParams({
    apiKey: firebaseConfig.apiKey || "",
    authDomain: firebaseConfig.authDomain || "",
    projectId: firebaseConfig.projectId || "",
    storageBucket: firebaseConfig.storageBucket || "",
    messagingSenderId: firebaseConfig.messagingSenderId || "",
    appId: firebaseConfig.appId || "",
  });
  return `/firebase-messaging-sw.js?${queryParams.toString()}`;
}

/**
 * Single, unified service worker registration helper.
 * Ensures the exact same registration URL and options are used across the app.
 */
export async function registerBloodBridgeServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    console.warn("[SW] Service worker registered: false (unsupported in this environment)");
    return null;
  }

  try {
    const swUrl = getServiceWorkerUrl();
    const registration = await navigator.serviceWorker.register(swUrl, { scope: "/" });
    await navigator.serviceWorker.ready;
    console.log("[SW] Service worker registered: true");
    return registration;
  } catch (err) {
    console.warn(
      "[SW] Service worker registered: false",
      err instanceof Error ? err.message : "Registration failed"
    );
    return null;
  }
}

export async function requestNotificationPermissionAndToken(): Promise<string | null> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    console.warn("[FCM] Browser does not support HTML5 notifications.");
    return null;
  }

  // Check existing permission state
  if (Notification.permission === "denied") {
    console.warn("[FCM] Notification permission: denied");
    return null;
  }

  const permission = await Notification.requestPermission();
  console.log(`[FCM] Notification permission: ${permission}`);
  if (permission !== "granted") {
    return null;
  }

  const messaging = await getFirebaseMessaging();
  if (!messaging) {
    console.warn("[FCM] Firebase messaging configuration is incomplete.");
    return null;
  }

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.warn("[FCM] Firebase VAPID key is missing.");
    return null;
  }

  try {
    let swRegistration: ServiceWorkerRegistration | undefined;
    if ("serviceWorker" in navigator) {
      await registerBloodBridgeServiceWorker();
      swRegistration = await navigator.serviceWorker.ready;
    }

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swRegistration,
    });

    if (token) {
      console.log("[FCM] FCM token registration: successful");
      return token;
    } else {
      console.warn("[FCM] FCM token registration: failed");
    }
  } catch (error) {
    console.error(
      "[FCM] FCM token registration: failed",
      error instanceof Error ? error.message : "Unknown error"
    );
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
        callback(payload);
      });
    }
  });

  return () => {
    if (unsubscribe) unsubscribe();
  };
}
