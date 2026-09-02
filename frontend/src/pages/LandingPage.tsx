import { useNavigate } from "react-router-dom";
import BloodFlowNetwork from "../components/BloodFlowNetwork";

const steps = [
  {
    icon: "🏥",
    label: "VERIFY",
    desc: "Hospital confirms patient blood requirement",
    color: "#38bdf8",
  },
  {
    icon: "🏦",
    label: "INVENTORY SCAN",
    desc: "System searches nearby blood-bank inventory",
    color: "#00bfb3",
  },
  {
    icon: "🤖",
    label: "SMART MATCHING",
    desc: "AI engine ranks eligible donors by compatibility",
    color: "#818cf8",
  },
  {
    icon: "✓",
    label: "FULFILLMENT",
    desc: "Fastest path delivers verified blood units",
    color: "#10b981",
  },
];

const stats = [
  { value: "8", label: "Connected Blood Banks", color: "#00bfb3" },
  { value: "126", label: "Verified Donors", color: "#818cf8" },
  { value: "< 2 min", label: "Avg. Match Time", color: "#f59e0b" },
  { value: "99.4%", label: "Fulfillment Rate", color: "#10b981" },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bb-network-bg text-bb-text overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-40 glass border-b border-bb-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="/bloodbridge-logo.png"
              alt="BloodBridge logo"
              className="size-8 object-contain"
            />

            <span className="font-bold text-bb-text tracking-tight">
              Blood<span className="text-bb-crimson-bright">Bridge</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="#how"
              className="text-sm text-bb-muted hover:text-bb-text transition-colors hidden sm:block"
            >
              How it works
            </a>
            <button
              onClick={() => navigate("/roles")}
              className="px-4 py-1.5 rounded-lg bg-bb-crimson/15 border border-bb-crimson/40 text-bb-crimson-bright text-sm font-semibold hover:bg-bb-crimson/25 transition-all"
            >
              Join Network
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-28 pb-20 px-4 sm:px-6 overflow-hidden">
        {/* Background ambient */}
        {/* BloodBridge network background */}
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          aria-hidden="true"
        >
          {/* Soft ambient glows */}
          <div className="absolute -top-32 -left-32 size-96 rounded-full bg-bb-crimson/8 blur-3xl" />

          <div className="absolute top-1/3 right-0 size-96 rounded-full bg-bb-blue/6 blur-3xl" />

          <div className="absolute bottom-0 left-1/3 size-80 rounded-full bg-bb-teal/6 blur-3xl" />

          {/* Network nodes */}
          <span className="bb-node" style={{ left: "7%", top: "30%" }} />

          <span className="bb-node blue" style={{ left: "20%", top: "70%" }} />

          <span className="bb-node teal" style={{ left: "42%", top: "18%" }} />

          <span className="bb-node" style={{ left: "58%", top: "82%" }} />

          <span className="bb-node blue" style={{ left: "75%", top: "20%" }} />

          <span className="bb-node teal" style={{ left: "91%", top: "65%" }} />

          {/* Network connections */}
          <div
            className="bb-connection"
            style={{
              width: "280px",
              left: "7%",
              top: "30%",
              transform: "rotate(18deg)",
            }}
          >
            <span className="bb-signal" />
          </div>

          <div
            className="bb-connection"
            style={{
              width: "320px",
              left: "42%",
              top: "18%",
              transform: "rotate(12deg)",
            }}
          >
            <span className="bb-signal" />
          </div>

          <div
            className="bb-connection"
            style={{
              width: "260px",
              left: "75%",
              top: "20%",
              transform: "rotate(35deg)",
            }}
          >
            <span className="bb-signal" />
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-bb-teal/30 bg-bb-teal/10 px-3 py-1 text-xs font-mono font-bold tracking-widest text-bb-teal uppercase">
              <span
                className="size-1.5 rounded-full bg-bb-teal animate-blink"
                aria-hidden="true"
              />
              Live Network Active
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
              Every Second{" "}
              <span className="text-gradient-crimson">Matters.</span>
              <br />
              Every Connection{" "}
              <span className="text-gradient-teal">Saves.</span>
            </h1>

            <p className="text-lg text-bb-dim leading-relaxed max-w-lg">
              BloodBridge intelligently connects verified hospital requests with
              nearby blood-bank inventory and eligible donors — ensuring the
              fastest possible path to fulfillment.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate("/roles")}
                className="px-6 py-3 rounded-xl bg-bb-crimson border border-bb-crimson text-white font-bold text-sm hover:bg-bb-crimson-bright transition-all glow-crimson"
              >
                Join BloodBridge
              </button>
              <a
                href="#how"
                className="px-6 py-3 rounded-xl glass border-bb-border-light text-bb-text font-semibold text-sm hover:border-bb-border-light transition-all"
              >
                Explore How It Works
              </a>
            </div>
          </div>

          <div className="flex justify-center animate-float-y">
            <BloodFlowNetwork variant="hero" />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-10 px-4 sm:px-6 border-y border-bb-border bg-white/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p
                className="font-mono text-2xl sm:text-3xl font-bold"
                style={{ color: s.color }}
              >
                {s.value}
              </p>
              <p className="text-xs text-bb-muted mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <p className="font-mono text-xs uppercase tracking-widest text-bb-muted mb-3">
              The Workflow
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-bb-text">
              From Request to Fulfillment
            </h2>
            <p className="text-bb-dim mt-3 max-w-xl mx-auto">
              Four intelligent stages ensure the right blood reaches the right
              patient at the right time.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {steps.map((s, i) => (
              <div
                key={s.label}
                className="glass rounded-2xl p-5 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300"
              >
                <div
                  className="absolute top-0 right-0 font-mono text-7xl font-black opacity-5 text-bb-text leading-none pr-4 pt-1"
                  aria-hidden="true"
                >
                  {i + 1}
                </div>
                <div
                  className="size-12 rounded-xl flex items-center justify-center text-xl mb-4"
                  style={{
                    background: `${s.color}18`,
                    border: `1px solid ${s.color}40`,
                  }}
                >
                  {s.icon}
                </div>
                <p
                  className="font-mono text-xs font-bold tracking-widest mb-2"
                  style={{ color: s.color }}
                >
                  {s.label}
                </p>
                <p className="text-sm text-bb-dim leading-snug">{s.desc}</p>
                {i < steps.length - 1 && (
                  <div
                    className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-bb-muted"
                    aria-hidden="true"
                  >
                    →
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="py-20 px-4 sm:px-6 border-t border-bb-border">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-bb-text">
              Three Nodes. One Network.
            </h2>
            <p className="text-bb-dim mt-3">
              Each role is a trusted, verified participant in the BloodBridge
              network.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {[
              {
                icon: "🏥",
                title: "Hospital",
                desc: "Create verified blood requests and coordinate fulfillment in real time.",
                color: "#38bdf8",
                role: "hospital" as const,
              },
              {
                icon: "🏦",
                title: "Blood Bank",
                desc: "Manage inventory and respond instantly to verified hospital requirements.",
                color: "#00bfb3",
                role: "blood-bank" as const,
              },
              {
                icon: "🩸",
                title: "Donor",
                desc: "Join the verified donor network and respond when your blood can save a life.",
                color: "#818cf8",
                role: "donor" as const,
              },
            ].map((r) => (
              <button
                key={r.title}
                onClick={() => navigate("/roles")}
                className="glass rounded-2xl p-6 text-left hover:scale-[1.02] transition-all duration-200 group focus:outline-none focus-visible:ring-2 focus-visible:ring-bb-indigo"
              >
                <div
                  className="size-14 rounded-2xl flex items-center justify-center text-2xl mb-4 transition-transform group-hover:scale-110 duration-200"
                  style={{
                    background: `${r.color}15`,
                    border: `1px solid ${r.color}35`,
                  }}
                >
                  {r.icon}
                </div>
                <h3 className="font-bold text-bb-text text-lg mb-2">
                  {r.title}
                </h3>
                <p className="text-sm text-bb-dim leading-snug">{r.desc}</p>
              </button>
            ))}
          </div>
          <div className="text-center mt-10">
            <button
              onClick={() => navigate("/roles")}
              className="px-8 py-3 rounded-xl bg-bb-crimson/15 border border-bb-crimson/40 text-bb-crimson-bright font-bold hover:bg-bb-crimson/25 transition-all"
            >
              Connect to the Network →
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-bb-border py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm">🩸</span>
            <span className="font-bold text-bb-text">
              Blood<span className="text-bb-crimson-bright">Bridge</span>
            </span>
          </div>
          <p className="text-xs text-bb-muted font-mono">
            Connecting verified need with life-saving supply.
          </p>
        </div>
      </footer>
    </div>
  );
}
