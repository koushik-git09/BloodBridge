import { useState, useRef, useEffect } from "react";
import type { DonorAvailability } from "../../types";

export type AvailabilityOption = {
  key: DonorAvailability;
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: string;
  desc: string;
};

export const availabilityOptions: AvailabilityOption[] = [
  {
    key: "AVAILABLE",
    label: "Available",
    color: "#059669",
    bg: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.40)",
    icon: "🟢",
    desc: "Ready to respond to requests",
  },
  {
    key: "BUSY",
    label: "Busy",
    color: "#d97706",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.40)",
    icon: "🟡",
    desc: "May not respond immediately",
  },
  {
    key: "UNAVAILABLE",
    label: "Unavailable",
    color: "#e11d48",
    bg: "rgba(225,29,72,0.12)",
    border: "rgba(225,29,72,0.40)",
    icon: "🔴",
    desc: "Will not receive requests",
  },
];

interface AvailabilitySelectorProps {
  availability: DonorAvailability;
  onUpdate: (newAvail: DonorAvailability) => Promise<void>;
  loading?: boolean;
}

export default function AvailabilitySelector({
  availability,
  onUpdate,
  loading = false,
}: AvailabilitySelectorProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentOption =
    availabilityOptions.find((o) => o.key === availability) ??
    availabilityOptions[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = async (key: DonorAvailability) => {
    if (key === availability || loading) return;
    setOpen(false);
    await onUpdate(key);
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        disabled={loading}
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition hover:opacity-90 active:scale-98 disabled:opacity-50"
        style={{
          background: currentOption.bg,
          border: `1px solid ${currentOption.border}`,
          color: currentOption.color,
        }}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span>{currentOption.icon}</span>
        <span>{currentOption.label}</span>
        <svg
          className={`size-3 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-bb-border bg-white/95 p-1.5 shadow-xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95">
          <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-bb-muted">
            Set Availability Status
          </p>
          {availabilityOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => handleSelect(opt.key)}
              className={`flex w-full items-start gap-2.5 rounded-xl px-3 py-2 text-left text-xs transition ${
                opt.key === availability
                  ? "bg-slate-100 font-semibold"
                  : "hover:bg-slate-50"
              }`}
            >
              <span className="mt-0.5 text-sm" style={{ color: opt.color }}>
                {opt.icon}
              </span>
              <div>
                <p className="font-semibold text-bb-text">{opt.label}</p>
                <p className="text-[11px] text-bb-muted">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
