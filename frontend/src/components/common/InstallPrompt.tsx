import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISSAL_KEY = "bloodbridge_install_dismissed_until";
const DISMISSAL_DAYS = 7;

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Check if already in standalone / installed mode
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.navigator as any).standalone === true;

    setIsStandalone(isStandaloneMode);
    if (isStandaloneMode) return;

    // Check if user previously dismissed prompt within the cooldown period
    const dismissedUntil = localStorage.getItem(DISMISSAL_KEY);
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) {
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isSafari = isAppleDevice && !/crios|fxios/.test(userAgent) && !(window as any).MSStream;

    if (isAppleDevice && isSafari) {
      setIsIOS(true);
      setShowPrompt(true);
      return;
    }

    // Android / Chromium beforeinstallprompt listener
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setShowPrompt(false);
      } else {
        handleDismiss();
      }
    } catch (err) {
      console.warn("[PWA] Installation prompt failed:", err);
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    const cooldownMs = DISMISSAL_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISSAL_KEY, String(Date.now() + cooldownMs));
    setShowPrompt(false);
  };

  if (!showPrompt || isStandalone) {
    return null;
  }

  return (
    <aside
      aria-label="Install App Prompt"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="glass rounded-2xl border border-red-200/50 bg-white/95 p-4 shadow-2xl backdrop-blur-xl ring-1 ring-black/5 dark:bg-slate-900/95 dark:border-slate-800">
        <div className="flex items-start gap-3">
          <img
            src="/bloodbridge-icon-192.png"
            alt="BloodBridge App Icon"
            className="size-11 shrink-0 rounded-xl object-contain shadow-md"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-black tracking-tight text-bb-text dark:text-white flex items-center gap-1.5">
                <span>Install BloodBridge</span>
                <span className="rounded-full bg-bb-crimson/10 px-1.5 py-0.5 text-[9px] font-bold text-bb-crimson uppercase">
                  App
                </span>
              </h3>
              <button
                type="button"
                onClick={handleDismiss}
                className="size-7 rounded-lg text-bb-muted hover:bg-slate-100 hover:text-bb-text dark:hover:bg-slate-800 dark:hover:text-white flex items-center justify-center text-xs transition"
                aria-label="Dismiss installation prompt"
              >
                ✕
              </button>
            </div>

            <p className="mt-1 text-[11px] text-bb-dim dark:text-slate-300 leading-snug">
              {isIOS
                ? "Install on your iPhone/iPad: tap the Share button and select 'Add to Home Screen' for instant emergency blood alerts."
                : "Add BloodBridge to your device for instant proximity alerts, faster access, and offline readiness."}
            </p>

            <div className="mt-3 flex items-center gap-2">
              {!isIOS && deferredPrompt && (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  disabled={installing}
                  className="rounded-xl bg-bb-crimson px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-bb-crimson-bright active:scale-[0.98] disabled:opacity-50 min-h-[38px] flex items-center justify-center gap-1.5"
                >
                  {installing ? (
                    <span>Installing…</span>
                  ) : (
                    <>
                      <span>📲</span>
                      <span>Install App</span>
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={handleDismiss}
                className="rounded-xl border border-bb-border px-3 py-2 text-xs font-semibold text-bb-muted transition hover:bg-slate-100 hover:text-bb-text dark:hover:bg-slate-800 dark:hover:text-white min-h-[38px]"
              >
                {isIOS ? "Got it" : "Later"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
