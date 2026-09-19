import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { forgotPassword } from "../services/authService";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get("role") || "donor";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await forgotPassword(email.trim());
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to send reset link. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const loginPath = `/login/${roleParam}`;

  return (
    <div className="min-h-screen bb-network-bg flex flex-col">
      {/* Top Navbar */}
      <nav className="glass border-b border-bb-border px-4 sm:px-6 h-14 flex items-center shrink-0">
        <button
          type="button"
          onClick={() => navigate(loginPath)}
          className="flex items-center gap-2 text-bb-muted hover:text-bb-text transition-colors"
        >
          <svg
            className="size-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
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

      {/* Background ambient accents */}
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -top-32 -left-32 size-96 rounded-full bg-bb-crimson/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 size-96 rounded-full bg-bb-blue/5 blur-3xl" />
      </div>

      {/* Main card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-7">
            <p className="font-mono text-xs uppercase tracking-widest text-bb-muted mb-3">
              Account Recovery
            </p>
            <h1 className="text-3xl font-black text-bb-text tracking-tight">
              Reset Your <span className="text-gradient-crimson">Password</span>
            </h1>
            <p className="text-bb-dim text-xs sm:text-sm mt-2 max-w-xs mx-auto">
              Enter your registered email address to receive password reset instructions.
            </p>
          </div>

          <div
            className="glass rounded-2xl p-6 sm:p-8 border border-bb-border shadow-xl bg-white/80 backdrop-blur-md"
          >
            {error && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 font-medium">
                {error}
              </div>
            )}

            {submitted ? (
              <div className="space-y-5 text-center py-2 animate-in fade-in">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-2xl">
                  ✉️
                </div>
                <div>
                  <h3 className="text-base font-bold text-bb-text">
                    Check your email
                  </h3>
                  <p className="text-xs text-bb-muted mt-2 leading-relaxed">
                    If an account exists for <strong>{email}</strong>, a secure password reset link has been dispatched.
                  </p>
                  <p className="text-[11px] text-bb-dim mt-2">
                    The link will expire in 15 minutes. Please check your spam folder if you do not see it shortly.
                  </p>
                </div>

                <div className="pt-2 border-t border-bb-border">
                  <button
                    type="button"
                    onClick={() => navigate(loginPath)}
                    className="w-full rounded-xl bg-bb-crimson px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-bb-crimson-bright transition active:scale-98"
                  >
                    Back to Sign In
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-bb-dim mb-2">
                    Registered Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    required
                    autoFocus
                    className="w-full rounded-xl border border-bb-border bg-white px-4 py-3 text-sm text-bb-text outline-none transition focus:ring-2 focus:ring-bb-crimson"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full rounded-xl bg-bb-crimson px-4 py-3 text-sm font-bold text-white transition-all shadow-md hover:bg-bb-crimson-bright disabled:opacity-60 disabled:cursor-not-allowed active:scale-98 inline-flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="size-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Sending link...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => navigate(loginPath)}
                    className="text-xs font-semibold text-bb-muted hover:text-bb-text transition-colors"
                  >
                    ← Back to Login
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
