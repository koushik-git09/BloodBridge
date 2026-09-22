import { apiRequest } from "./api";
import { requestNotificationPermissionAndToken } from "./firebase";
import type { Notification } from "../types";

export interface RegisterTokenResponse {
  status: string;
  message: string;
  platform: string;
}

export async function registerFCMToken(
  token: string,
  platform: string = "web"
): Promise<RegisterTokenResponse> {
  return apiRequest<RegisterTokenResponse>("/api/notifications/register-token", {
    method: "POST",
    body: JSON.stringify({ token, platform }),
  });
}

export async function unregisterFCMToken(token: string): Promise<{ status: string }> {
  return apiRequest<{ status: string }>("/api/notifications/register-token", {
    method: "DELETE",
    body: JSON.stringify({ token }),
  });
}

export async function getNotifications(limit: number = 50): Promise<Notification[]> {
  const data = await apiRequest<Notification[]>(`/api/notifications?limit=${limit}`);
  return data.map((item) => ({
    ...item,
    time: item.created_at
      ? new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : item.time || "Recent",
  }));
}

export async function markNotificationAsRead(notificationId: string): Promise<{ status: string; id: string }> {
  return apiRequest<{ status: string; id: string }>(`/api/notifications/${notificationId}/read`, {
    method: "PATCH",
  });
}

export async function markAllNotificationsAsRead(): Promise<{ status: string; marked_read_count: number }> {
  return apiRequest<{ status: string; marked_read_count: number }>("/api/notifications/read-all", {
    method: "PATCH",
  });
}

export function getBrowserNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

export async function enableNotifications(): Promise<{
  success: boolean;
  token?: string | null;
  error?: string;
}> {
  try {
    const token = await requestNotificationPermissionAndToken();
    if (!token) {
      const permission = getBrowserNotificationPermission();
      if (permission === "denied") {
        return {
          success: false,
          error: "Notification permission was denied. Please enable notifications in your browser settings.",
        };
      }
      return {
        success: false,
        error: "Could not retrieve device token. Please verify browser notification support.",
      };
    }

    // Register with backend
    await registerFCMToken(token, "web");
    localStorage.setItem("bloodbridge_fcm_token", token);

    return { success: true, token };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to register notifications";
    return { success: false, error: message };
  }
}
