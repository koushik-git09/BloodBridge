import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../services/authService";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError("Missing password reset token. Please request a new link.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await resetPassword(token, newPassword);
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to reset password. The link may have expired."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bb-network-bg flex flex-col">
      {/* Top Navbar */}
      <nav className="glass border-b border-bb-border px-4 sm:px-6 h-14 flex items-center shrink-0">
        <button
          type="button"
          onClick={() => navigate("/login/donor")}
          className="flex items-center gap-2 text-bb-muted hover:text-bb-text transition-colors"
        >
          <img
            src="/bloodbridge-logo.png"
            alt="BloodBridge logo"
            className="size-7 object-contain"
          />
          <span className="font-bold text-bb-text">
            Blood<span className="text-bb-crimson-bright">Bridge</span>
          </span>
        </button>
      </nav>

      {/* Ambient backgrounds */}
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -top-32 -left-32 size-96 rounded-full bg-bb-crimson/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 size-96 rounded-full bg-bb-blue/5 blur-3xl" />
      </div>

      {/* Main Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-7">
            <p className="font-mono text-xs uppercase tracking-widest text-bb-muted mb-3">
              Security Protocol
            </p>
            <h1 className="text-3xl font-black text-bb-text tracking-tight">
              Create New <span className="text-gradient-crimson">Password</span>
            </h1>
            <p className="text-bb-dim text-xs sm:text-sm mt-2">
              Choose a strong password with at least 8 characters.
            </p>
          </div>

          <div className="glass rounded-2xl p-6 sm:p-8 border border-bb-border shadow-xl bg-white/80 backdrop-blur-md">
            {error && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 font-medium">
                {error}
                {(error.includes("expired") || error.includes("invalid") || error.includes("Missing")) && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => navigate("/forgot-password")}
                      className="font-bold underline hover:text-red-900 text-xs"
                    >
                      Request a new reset link →
                    </button>
                  </div>
                )}
              </div>
            )}

            {success ? (
              <div className="space-y-5 text-center py-2 animate-in fade-in">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-2xl text-emerald-600">
                  ✓
                </div>
                <div>
                  <h3 className="text-base font-bold text-bb-text">
                    Password Reset Successful
                  </h3>
                  <p className="text-xs text-bb-muted mt-2">
                    Your password has been securely updated. You can now sign in with your new password.
                  </p>
                </div>
                <div className="pt-2 border-t border-bb-border">
                  <button
                    type="button"
                    onClick={() => navigate("/login/donor")}
                    className="w-full rounded-xl bg-bb-crimson px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-bb-crimson-bright transition active:scale-98"
                  >
                    Proceed to Donor Login
                  </button>
                </div>
              </div>
            ) : !token ? (
              <div className="text-center py-4 space-y-4">
                <p className="text-xs text-bb-muted">
                  No valid reset token was detected in the URL.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="rounded-xl bg-bb-crimson px-4 py-2.5 text-xs font-bold text-white hover:bg-bb-crimson-bright transition"
                >
                  Request Password Reset
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-bb-dim mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                    autoFocus
                    className="w-full rounded-xl border border-bb-border bg-white px-4 py-3 text-sm text-bb-text outline-none transition focus:ring-2 focus:ring-bb-crimson"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-bb-dim mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Re-enter your new password"
                    required
                    minLength={8}
                    className="w-full rounded-xl border border-bb-border bg-white px-4 py-3 text-sm text-bb-text outline-none transition focus:ring-2 focus:ring-bb-crimson"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !newPassword || !confirmPassword}
                  className="w-full rounded-xl bg-bb-crimson px-4 py-3 text-sm font-bold text-white transition-all shadow-md hover:bg-bb-crimson-bright disabled:opacity-60 disabled:cursor-not-allowed active:scale-98 inline-flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? (
                    <>
                      <svg className="size-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Updating password...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => navigate("/login/donor")}
                    className="text-xs font-semibold text-bb-muted hover:text-bb-text transition-colors"
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
