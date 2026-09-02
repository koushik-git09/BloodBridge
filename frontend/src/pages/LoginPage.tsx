import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { getCurrentUser, login } from "../services/authService";
import type { Role } from "../types";

const roleConfig = {
  HOSPITAL: {
    title: "Hospital",
    subtitle: "Command Center",
    icon: "🏥",
    color: "#2563EB",
    background: "#EFF6FF",
    border: "#BFDBFE",
    description: "Access your blood request command center.",
  },

  BLOOD_BANK: {
    title: "Blood Bank",
    subtitle: "Operations Center",
    icon: "🏦",
    color: "#059669",
    background: "#ECFDF5",
    border: "#A7F3D0",
    description: "Manage inventory and blood reservations.",
  },

  DONOR: {
    title: "Donor",
    subtitle: "Network Member",
    icon: "🩸",
    color: "#DC2626",
    background: "#FFF1F2",
    border: "#FECDD3",
    description: "Connect to the donor network and save lives.",
  },
};

const roleFromPath = (value?: string): Role | undefined => {
  if (value === "hospital") return "HOSPITAL";
  if (value === "blood-bank") return "BLOOD_BANK";
  if (value === "donor") return "DONOR";
  return undefined;
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { role: roleParam } = useParams<{ role: string }>();
  const selectedRole = roleFromPath(roleParam);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!selectedRole) return <Navigate to="/roles" replace />;

  const config = roleConfig[selectedRole];

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      // 1. Login
      await login(email, password);

      // 3. Get logged-in user details
      const user = await getCurrentUser();

      // The backend role is authoritative, even if the login URL differs.
      localStorage.setItem("bloodbridge_user", JSON.stringify(user));

      navigate(
        user.role === "BLOOD_BANK"
          ? "/dashboard/blood-bank"
          : `/dashboard/${user.role.toLowerCase()}`,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Login failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bb-network-bg flex flex-col">
      {/* Navigation */}
      <nav className="glass border-b border-bb-border px-4 sm:px-6 h-14 flex items-center shrink-0">
        <button
          onClick={() => navigate("/roles")}
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

          <span className="font-bold">
            Blood
            <span className="text-bb-crimson-bright">Bridge</span>
          </span>
        </button>
      </nav>

      {/* Background effects */}
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -top-32 -left-32 size-96 rounded-full bg-bb-crimson/5 blur-3xl" />

        <div className="absolute -bottom-32 -right-32 size-96 rounded-full bg-bb-blue/5 blur-3xl" />

        <span
          className="bb-node"
          style={{
            left: "12%",
            top: "22%",
          }}
        />

        <span
          className="bb-node blue"
          style={{
            left: "82%",
            top: "20%",
          }}
        />

        <span
          className="bb-node teal"
          style={{
            left: "15%",
            top: "75%",
          }}
        />

        <span
          className="bb-node"
          style={{
            left: "85%",
            top: "75%",
          }}
        />
      </div>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-7">
            <p className="font-mono text-xs uppercase tracking-widest text-bb-muted mb-3">
              Secure Access
            </p>

            <h1 className="text-3xl font-bold text-bb-text">
              Welcome to{" "}
              <span className="text-gradient-crimson">BloodBridge</span>
            </h1>

            <p className="text-bb-dim text-sm mt-3">
              Sign in to access your network dashboard.
            </p>
          </div>

          {/* Login Card */}
          <div
            className="rounded-2xl p-6 sm:p-8"
            style={{
              background: config.background,
              border: `1px solid ${config.border}`,
              boxShadow: "0 12px 40px rgba(15, 23, 42, 0.08)",
            }}
          >
            {/* Selected Role */}
            <div
              className="rounded-xl p-4 mb-6"
              style={{
                background: "rgba(255,255,255,0.6)",
                border: `1px solid ${config.border}`,
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="size-14 rounded-xl flex items-center justify-center text-2xl"
                  style={{
                    background: `${config.color}15`,
                    border: `1px solid ${config.color}40`,
                  }}
                >
                  {config.icon}
                </div>

                <div>
                  <h2 className="font-bold text-lg text-bb-text">
                    {config.title}
                  </h2>

                  <p
                    className="font-mono text-xs tracking-widest mt-1"
                    style={{
                      color: config.color,
                    }}
                  >
                    {config.subtitle}
                  </p>
                </div>
              </div>

              <p className="text-sm text-bb-dim mt-4">{config.description}</p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-bb-text mb-2">
                  Email Address
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-xl border border-bb-border bg-white px-4 py-3 text-sm text-bb-text outline-none transition focus:ring-2"
                  style={
                    {
                      "--tw-ring-color": config.color,
                    } as React.CSSProperties
                  }
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-bb-text mb-2">
                  Password
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full rounded-xl border border-bb-border bg-white px-4 py-3 text-sm text-bb-text outline-none transition focus:ring-2"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl px-4 py-3 font-semibold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: config.color,
                  boxShadow: `0 8px 20px ${config.color}35`,
                }}
              >
                {loading ? "Signing in..." : `Sign in as ${config.title}`}
              </button>
            </form>

            {/* Register */}
            <div className="text-center mt-6">
              <p className="text-sm text-bb-dim">Don't have an account?</p>

              <button
                onClick={() => navigate(`/register/${roleParam}`)}
                className="mt-2 text-sm font-semibold transition-colors"
                style={{
                  color: config.color,
                }}
              >
                Create a BloodBridge account →
              </button>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-bb-muted font-mono mt-6">
            Secure • Connected • Life-saving Network
          </p>
        </div>
      </main>
    </div>
  );
}
