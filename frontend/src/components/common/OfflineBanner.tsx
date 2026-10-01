import { useEffect, useState } from "react";

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [justCameOnline, setJustCameOnline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setJustCameOnline(true);
      const timer = setTimeout(() => {
        setJustCameOnline(false);
      }, 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setJustCameOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline && !justCameOnline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-50 animate-in fade-in slide-in-from-top-2 duration-300"
    >
      {isOffline ? (
        <div className="bg-amber-600 px-4 py-2 text-center text-xs font-bold text-white shadow-md flex items-center justify-center gap-2">
          <span>⚠️</span>
          <span>You are currently offline. Hospital requests, matching, and responses require an internet connection.</span>
        </div>
      ) : (
        <div className="bg-emerald-600 px-4 py-2 text-center text-xs font-bold text-white shadow-md flex items-center justify-center gap-2">
          <span>✓</span>
          <span>Back online! Reconnecting to BloodBridge live network.</span>
        </div>
      )}
    </div>
  );
}
