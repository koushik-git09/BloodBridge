/**
 * BloodBridge Real-Time Invalidation & Cross-Component Event Bus
 *
 * Implements Level 2 & 3 real-time synchronization:
 * - Emits targeted data refresh signals on API mutations
 * - Bridges FCM foreground push notifications directly to active dashboards
 * - Refetches on window visibility change / reconnect
 */

export type BloodBridgeEventType =
  | "bloodbridge:request-updated"
  | "bloodbridge:notification-received"
  | "bloodbridge:inventory-updated"
  | "bloodbridge:refresh-all";

export interface BloodBridgeEventDetail {
  target?: "hospital" | "donor" | "blood-bank" | "all";
  requestId?: string;
  source?: string;
  payload?: unknown;
}

export function emitBloodBridgeEvent(
  type: BloodBridgeEventType,
  detail: BloodBridgeEventDetail = {}
): void {
  if (typeof window === "undefined") return;

  const event = new CustomEvent(type, {
    detail,
    bubbles: true,
    cancelable: true,
  });
  window.dispatchEvent(event);
}

export function subscribeBloodBridgeEvent(
  type: BloodBridgeEventType,
  callback: (detail: BloodBridgeEventDetail) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<BloodBridgeEventDetail>;
    callback(customEvent.detail || {});
  };

  window.addEventListener(type, handler);
  return () => {
    window.removeEventListener(type, handler);
  };
}
