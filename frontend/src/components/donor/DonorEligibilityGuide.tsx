import { useState } from "react";

export const requirementCategories = [
  {
    title: "Basic Eligibility",
    icon: "✅",
    color: "#10b981",
    bg: "rgba(16,185,129,0.08)",
    border: "rgba(16,185,129,0.25)",
    rules: [
      { label: "Age", detail: "Must be between 18 and 65 years old." },
      { label: "Weight", detail: "Minimum body weight of 50 kg (110 lbs)." },
      { label: "Pulse", detail: "Regular pulse rate between 50–100 beats per minute." },
      { label: "Blood Pressure", detail: "Systolic 100–180 mmHg and diastolic 50–100 mmHg." },
      { label: "Temperature", detail: "Oral temperature must not exceed 37.5°C (99.5°F)." },
      { label: "Hemoglobin", detail: "Minimum 12.5 g/dL for females, 13.0 g/dL for males." },
    ],
  },
  {
    title: "Donation Interval",
    icon: "📅",
    color: "#818cf8",
    bg: "rgba(129,140,248,0.08)",
    border: "rgba(129,140,248,0.25)",
    rules: [
      { label: "Whole Blood", detail: "At least 90 days (3 months) since your last whole blood donation." },
      { label: "Platelets", detail: "At least 7 days since last platelet donation; maximum 24 times per year." },
      { label: "Plasma", detail: "At least 28 days since your last plasma donation." },
      { label: "Double Red Cells", detail: "At least 112 days between double red cell donations." },
    ],
  },
  {
    title: "Health & Lifestyle",
    icon: "🏥",
    color: "#38bdf8",
    bg: "rgba(56,189,248,0.08)",
    border: "rgba(56,189,248,0.25)",
    rules: [
      { label: "No Active Illness", detail: "Must be free of cold, flu, fever, or active infection on the day of donation." },
      { label: "Chronic Conditions", detail: "Donors with controlled hypertension or diabetes may still be eligible — consult the screening team." },
      { label: "Pregnancy", detail: "Not eligible during pregnancy or for 6 months after delivery." },
      { label: "Breastfeeding", detail: "Wait until 3 months after breastfeeding has ended." },
      { label: "Recent Surgery", detail: "Wait 6–12 months after major surgery, depending on the procedure." },
      { label: "Dental Work", detail: "Wait 24 hours after a simple filling; 1 month after oral surgery." },
    ],
  },
  {
    title: "Medications & Substances",
    icon: "💊",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.25)",
    rules: [
      { label: "Antibiotics", detail: "Wait 14 days after completing a course of antibiotics." },
      { label: "Aspirin", detail: "Wait 48 hours if donating platelets; no waiting period for whole blood." },
      { label: "Blood Thinners", detail: "Not eligible while on anticoagulants such as warfarin or rivaroxaban." },
      { label: "Alcohol", detail: "Avoid alcohol for at least 24 hours before donation." },
      { label: "Vaccinations", detail: "Most vaccines require a waiting period of 14–28 days. Flu vaccine: 24 hours." },
      { label: "Accutane / Isotretinoin", detail: "Wait 1 month after last dose." },
    ],
  },
  {
    title: "Travel & Tattoos",
    icon: "✈️",
    color: "#c01832",
    bg: "rgba(192,24,50,0.08)",
    border: "rgba(192,24,50,0.25)",
    rules: [
      { label: "Tattoos", detail: "Wait 6 months after getting a tattoo in a non-regulated facility; 3 months for regulated studios." },
      { label: "Piercings", detail: "Wait 6 months after body piercing with shared or non-sterile equipment." },
      { label: "International Travel", detail: "Travel to malaria-risk areas requires a 3-month deferral after return." },
      { label: "Needle Use", detail: "Intravenous drug users and those with needlestick exposures are indefinitely deferred." },
    ],
  },
];

export default function DonorEligibilityGuide() {
  const [openCategory, setOpenCategory] = useState<string | null>("Basic Eligibility");

  return (
    <div className="space-y-3">
      {requirementCategories.map((cat) => {
        const isOpen = openCategory === cat.title;

        return (
          <div
            key={cat.title}
            className="glass rounded-2xl border border-bb-border overflow-hidden transition-all shadow-sm"
          >
            <button
              type="button"
              onClick={() => setOpenCategory(isOpen ? null : cat.title)}
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/40 transition"
              aria-expanded={isOpen}
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex size-9 items-center justify-center rounded-xl text-lg shadow-sm"
                  style={{
                    backgroundColor: cat.bg,
                    border: `1px solid ${cat.border}`,
                  }}
                >
                  {cat.icon}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-bb-text">{cat.title}</h3>
                  <p className="text-[11px] text-bb-muted">
                    {cat.rules.length} screening guidelines
                  </p>
                </div>
              </div>
              <svg
                className={`size-4 text-bb-muted transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isOpen && (
              <div className="px-5 pb-5 pt-2 border-t border-bb-border/50 divide-y divide-bb-border/40">
                {cat.rules.map((rule) => (
                  <div key={rule.label} className="py-2.5 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 text-xs">
                    <span className="font-semibold text-bb-text sm:w-36 shrink-0">
                      {rule.label}
                    </span>
                    <span className="text-bb-muted leading-relaxed">
                      {rule.detail}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
