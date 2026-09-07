import type { Notification } from "../../types";

interface HospitalNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAllRead: () => void;
}

export default function HospitalNotificationsModal({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead,
}: HospitalNotificationsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg glass rounded-2xl border border-bb-border bg-white/95 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-bb-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🔔</span>
            <h2 className="text-base font-bold text-bb-text">Notifications & Alerts</h2>
          </div>
          <div className="flex items-center gap-3">
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="text-xs text-bb-crimson hover:underline font-semibold"
              >
                Mark all read
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="size-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-bb-muted hover:text-bb-text"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="overflow-y-auto p-4 divide-y divide-bb-border/50">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-bb-muted">
              No recent notifications or alerts.
            </div>
          ) : (
            notifications.map((notif) => {
              const badgeBg =
                notif.type === "CRITICAL"
                  ? "bg-red-50 text-red-700 border-red-200"
                  : notif.type === "SUCCESS"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : notif.type === "URGENT"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-blue-50 text-blue-700 border-blue-200";

              return (
                <div
                  key={notif.id}
                  className={`p-3.5 transition rounded-xl ${
                    notif.read ? "opacity-75" : "bg-white shadow-xs"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border ${badgeBg}`}
                    >
                      {notif.type}
                    </span>
                    <span className="text-[11px] text-bb-muted font-mono">{notif.time}</span>
                  </div>
                  <h4 className="mt-2 text-xs font-bold text-bb-text">{notif.title}</h4>
                  <p className="mt-0.5 text-xs text-bb-dim">{notif.message}</p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
