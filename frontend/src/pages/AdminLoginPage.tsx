import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { adminLogin } from "../services/adminService";

export default function AdminLoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await adminLogin(email.trim(), password);
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Admin authentication failed. Please verify your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bb-network-bg flex flex-col">
      {/* Top Navbar */}
      <nav className="glass border-b border-bb-border px-4 sm:px-6 h-14 flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={() => navigate("/roles")}
          className="flex items-center gap-2 text-bb-muted hover:text-bb-text transition-colors"
        >
          <svg
            className="size-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
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

        <span className="font-mono text-xs uppercase tracking-widest text-bb-muted bg-white/60 border border-bb-border px-3 py-1 rounded-full">
          Admin Portal
        </span>
      </nav>

      {/* Ambient background glows */}
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
          {/* Header */}
          <div className="text-center mb-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-bb-crimson/10 border border-bb-crimson/20 text-bb-crimson-bright font-mono text-xs uppercase tracking-wider mb-3">
              <span className="size-2 rounded-full bg-bb-crimson animate-pulse" />
              Restricted Area
            </div>
            <h1 className="text-3xl font-black text-bb-text tracking-tight">
              Administrator <span className="text-gradient-crimson">Sign In</span>
            </h1>
            <p className="text-bb-dim text-xs sm:text-sm mt-2">
              Sign in with your verified administrator credentials to access the coordination dashboard.
            </p>
          </div>

          {/* Form Card */}
          <div className="glass rounded-2xl p-6 sm:p-8 border border-bb-border shadow-xl bg-white/85 backdrop-blur-md">
            {error && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-bb-dim mb-2">
                  Admin Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@bloodbridge.org"
                  required
                  autoFocus
                  className="w-full rounded-xl border border-bb-border bg-white px-4 py-3 text-sm text-bb-text outline-none transition focus:ring-2 focus:ring-bb-crimson"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-bb-dim mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border border-bb-border bg-white px-4 py-3 text-sm text-bb-text outline-none transition focus:ring-2 focus:ring-bb-crimson"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-bb-crimson px-4 py-3 text-sm font-bold text-white transition-all shadow-md hover:bg-bb-crimson-bright disabled:opacity-60 disabled:cursor-not-allowed active:scale-98 inline-flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <svg className="size-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Authenticating...
                  </>
                ) : (
                  "Sign In to Admin Portal"
                )}
              </button>

              <div className="text-center pt-2">
                <Link
                  to="/roles"
                  className="text-xs font-semibold text-bb-muted hover:text-bb-text transition-colors"
                >
                  ← Back to Role Selection
                </Link>
              </div>
            </form>
          </div>

          <p className="text-center text-[11px] text-bb-muted font-mono mt-6">
            Authorized Personnel Only • Secure Access Controlled
          </p>
        </div>
      </main>
    </div>
  );
}
