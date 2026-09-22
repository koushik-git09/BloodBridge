import React, { useState, useEffect, useCallback, useRef } from "react";
import type { Notification } from "../../types";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  enableNotifications,
  getBrowserNotificationPermission,
} from "../../services/notificationService";
import { onForegroundMessage } from "../../services/firebase";

interface NotificationCenterProps {
  onSelectNotification?: (notif: Notification) => void;
  className?: string;
}

export default function NotificationCenter({
  onSelectNotification,
  className = "",
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchList = useCallback(async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch {
      // Ignore if unauthenticated or network transient
    }
  }, []);

  useEffect(() => {
    setPermission(getBrowserNotificationPermission());
    fetchList();

    // Listen for foreground FCM push events
    const unsub = onForegroundMessage((payload) => {
      fetchList();
      if (payload.notification?.title) {
        setFeedbackMessage(`🔔 ${payload.notification.title}`);
        setTimeout(() => setFeedbackMessage(null), 5000);
      }
    });

    // Gentle polling for fresh alerts
    const interval = setInterval(fetchList, 15000);

    return () => {
      if (unsub) unsub();
      clearInterval(interval);
    };
  }, [fetchList]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleEnablePush = async () => {
    setEnabling(true);
    setFeedbackMessage(null);
    const result = await enableNotifications();
    setEnabling(false);

    setPermission(getBrowserNotificationPermission());

    if (result.success) {
      setFeedbackMessage("Emergency push notifications activated successfully!");
      setTimeout(() => setFeedbackMessage(null), 4000);
      fetchList();
    } else {
      setFeedbackMessage(result.error || "Could not enable notifications.");
      setTimeout(() => setFeedbackMessage(null), 5000);
    }
  };

  const handleMarkRead = async (notifId: string, event?: React.MouseEvent) => {
    if (event) event.stopPropagation();
    try {
      await markNotificationAsRead(notifId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setLoading(true);
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClickItem = (notif: Notification) => {
    if (!notif.read) {
      handleMarkRead(notif.id);
    }
    if (onSelectNotification) {
      onSelectNotification(notif);
    }
    setIsOpen(false);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {/* Toast Alert */}
      {feedbackMessage && (
        <div className="fixed top-20 right-6 z-50 rounded-xl bg-slate-900 border border-slate-700 px-4 py-3 text-xs font-semibold text-white shadow-2xl animate-in fade-in slide-in-from-top-2 flex items-center gap-2">
          <span>{feedbackMessage}</span>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-white ml-2 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchList();
        }}
        className="relative rounded-xl border border-bb-border p-2 text-bb-muted hover:bg-white hover:text-bb-text transition focus:outline-none"
        aria-label="Notifications"
        title="View Notifications"
      >
        <span className="text-sm">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-bb-crimson text-[9px] font-bold text-white animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 glass rounded-2xl border border-bb-border bg-white/95 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] z-50 animate-in fade-in zoom-in-95">
          {/* Header */}
          <div className="px-4 py-3 border-b border-bb-border flex items-center justify-between bg-slate-50/80">
            <div className="flex items-center gap-2">
              <span className="text-sm">🔔</span>
              <h3 className="text-xs font-bold text-bb-text uppercase tracking-wider">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-bb-crimson/10 px-2 py-0.5 text-[10px] font-bold text-bb-crimson">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={loading}
                  className="text-[11px] font-semibold text-bb-crimson hover:underline disabled:opacity-50"
                >
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="size-6 rounded-md hover:bg-slate-200/60 flex items-center justify-center text-xs text-bb-muted hover:text-bb-text"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Browser Permission Banner (if not yet granted) */}
          {permission !== "granted" && permission !== "unsupported" && (
            <div className="p-3 bg-red-50/80 border-b border-red-100 flex items-start gap-2.5">
              <span className="text-base leading-none mt-0.5">🚨</span>
              <div className="flex-1">
                <p className="text-[11px] font-bold text-red-900 leading-snug">
                  Emergency Push Notifications
                </p>
                <p className="text-[10px] text-red-700 mt-0.5 leading-tight">
                  Enable device alerts for urgent blood matches and live hospital requests.
                </p>
                <button
                  type="button"
                  onClick={handleEnablePush}
                  disabled={enabling}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-red-700 transition disabled:opacity-50"
                >
                  {enabling ? "Enabling…" : "Enable Notifications"}
                </button>
              </div>
            </div>
          )}

          {/* Notification List */}
          <div className="overflow-y-auto divide-y divide-bb-border/50 max-h-96 p-2">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-bb-muted">
                No recent notifications. You're all caught up!
              </div>
            ) : (
              notifications.map((notif) => {
                const isEmergency =
                  notif.type === "CRITICAL" ||
                  notif.type === "URGENT" ||
                  notif.type === "EMERGENCY_BLOOD_REQUEST";
                const isSuccess =
                  notif.type === "SUCCESS" ||
                  notif.type === "DONOR_ACCEPTED" ||
                  notif.type === "DONATION_COMPLETED";

                const badgeBg = isEmergency
                  ? "bg-red-50 text-red-700 border-red-200"
                  : isSuccess
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-blue-50 text-blue-700 border-blue-200";

                const displayType =
                  notif.type === "EMERGENCY_BLOOD_REQUEST"
                    ? "EMERGENCY"
                    : notif.type === "DONOR_ACCEPTED"
                      ? "DONOR ACCEPTED"
                      : notif.type === "DONATION_COMPLETED"
                        ? "DONATION DONE"
                        : notif.type;

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleClickItem(notif)}
                    className={`p-3 rounded-xl transition cursor-pointer ${
                      notif.read
                        ? "opacity-75 hover:bg-slate-50/80"
                        : "bg-white shadow-xs border border-bb-border/60 hover:border-bb-crimson/30 hover:bg-red-50/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${badgeBg}`}
                      >
                        {displayType}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-bb-muted font-mono">
                          {notif.time || "Recent"}
                        </span>
                        {!notif.read && (
                          <button
                            type="button"
                            onClick={(e) => handleMarkRead(notif.id, e)}
                            className="size-2 rounded-full bg-bb-crimson hover:scale-125 transition"
                            title="Mark as read"
                          />
                        )}
                      </div>
                    </div>
                    <h4 className="mt-1.5 text-xs font-bold text-bb-text leading-tight">
                      {notif.title}
                    </h4>
                    <p className="mt-0.5 text-xs text-bb-dim leading-relaxed">
                      {notif.message}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
