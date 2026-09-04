import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { logout, getCurrentUser } from "../services/authService";
import { apiRequest } from "../services/api";
import type { DonorAvailability } from "../types";
import UrgencyBadge from "../components/UrgencyBadge";

type Tab = "overview" | "history" | "requirements";

type AvailabilityOption = {
  key: DonorAvailability;
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: string;
  desc: string;
};

type DonorRequest = {
  id: string;
  request_id: string;
  donor_id: string;
  hospital_id: string;

  hospital_name: string | null;
  patient_reference: string | null;

  blood_group: string;
  units_required: number | null;
  urgency: string | null;

  distance: number;
  match_score: number;
  trust_score: number;

  status: string;

  created_at: string;
  responded_at: string | null;
};

type DonorProfile = {
  name?: string;
  bloodGroup?: string;
  blood_group?: string;

  availability?: DonorAvailability;

  donationCount?: number;
  donation_count?: number;

  trustScore?: number;
  trust_score?: number;

  lastDonation?: string | null;
  last_donation_date?: string | null;

  responses?: number;

  [key: string]: unknown;
};

const availabilityOptions: AvailabilityOption[] = [
  {
    key: "AVAILABLE",
    label: "Available",
    color: "#00bfb3",
    bg: "rgba(0,191,179,0.10)",
    border: "rgba(0,191,179,0.35)",
    icon: "●",
    desc: "Ready to respond to requests",
  },
  {
    key: "BUSY",
    label: "Busy",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.10)",
    border: "rgba(245,158,11,0.35)",
    icon: "◐",
    desc: "May not respond immediately",
  },
  {
    key: "UNAVAILABLE",
    label: "Unavailable",
    color: "#94a3b8",
    bg: "rgba(148,163,184,0.10)",
    border: "rgba(148,163,184,0.35)",
    icon: "○",
    desc: "Will not receive requests",
  },
];

/*
|--------------------------------------------------------------------------
| Donation history
|--------------------------------------------------------------------------
| Kept as UI data for now.
| We can connect this to a backend endpoint later.
*/
const donorHistory = [
  {
    date: "Feb 15, 2024",
    hospital: "Apollo Hospitals",
    city: "Chennai",
    group: "O+",
    units: 1,
    status: "Completed",
  },
  {
    date: "Oct 8, 2023",
    hospital: "Fortis Hospital",
    city: "Mumbai",
    group: "O+",
    units: 1,
    status: "Completed",
  },
  {
    date: "Apr 2, 2023",
    hospital: "AIIMS Delhi",
    city: "Delhi",
    group: "O+",
    units: 1,
    status: "Completed",
  },
  {
    date: "Nov 20, 2022",
    hospital: "Chennai Blood Centre",
    city: "Chennai",
    group: "O+",
    units: 1,
    status: "Completed",
  },
  {
    date: "May 5, 2022",
    hospital: "LifeSource Blood Bank",
    city: "Chennai",
    group: "O+",
    units: 1,
    status: "Completed",
  },
];

/*
|--------------------------------------------------------------------------
| Donation requirements
|--------------------------------------------------------------------------
*/
const requirementCategories = [
  {
    title: "Basic Eligibility",
    icon: "✅",
    color: "#10b981",
    bg: "rgba(16,185,129,0.08)",
    border: "rgba(16,185,129,0.25)",
    rules: [
      {
        label: "Age",
        detail: "Must be between 18 and 65 years old.",
      },
      {
        label: "Weight",
        detail: "Minimum body weight of 50 kg (110 lbs).",
      },
      {
        label: "Pulse",
        detail: "Regular pulse rate between 50–100 beats per minute.",
      },
      {
        label: "Blood Pressure",
        detail: "Systolic 100–180 mmHg and diastolic 50–100 mmHg.",
      },
      {
        label: "Temperature",
        detail: "Oral temperature must not exceed 37.5°C (99.5°F).",
      },
      {
        label: "Hemoglobin",
        detail: "Minimum 12.5 g/dL for females, 13.0 g/dL for males.",
      },
    ],
  },
  {
    title: "Donation Interval",
    icon: "📅",
    color: "#818cf8",
    bg: "rgba(129,140,248,0.08)",
    border: "rgba(129,140,248,0.25)",
    rules: [
      {
        label: "Whole Blood",
        detail:
          "At least 90 days (3 months) since your last whole blood donation.",
      },
      {
        label: "Platelets",
        detail:
          "At least 7 days since last platelet donation; maximum 24 times per year.",
      },
      {
        label: "Plasma",
        detail: "At least 28 days since your last plasma donation.",
      },
      {
        label: "Double Red Cells",
        detail: "At least 112 days between double red cell donations.",
      },
    ],
  },
  {
    title: "Health & Lifestyle",
    icon: "🏥",
    color: "#38bdf8",
    bg: "rgba(56,189,248,0.08)",
    border: "rgba(56,189,248,0.25)",
    rules: [
      {
        label: "No Active Illness",
        detail:
          "Must be free of cold, flu, fever, or active infection on the day of donation.",
      },
      {
        label: "Chronic Conditions",
        detail:
          "Donors with controlled hypertension or diabetes may still be eligible — consult the screening team.",
      },
      {
        label: "Pregnancy",
        detail: "Not eligible during pregnancy or for 6 months after delivery.",
      },
      {
        label: "Breastfeeding",
        detail: "Wait until 3 months after breastfeeding has ended.",
      },
      {
        label: "Recent Surgery",
        detail:
          "Wait 6–12 months after major surgery, depending on the procedure.",
      },
      {
        label: "Dental Work",
        detail:
          "Wait 24 hours after a simple filling; 1 month after oral surgery.",
      },
    ],
  },
  {
    title: "Medications & Substances",
    icon: "💊",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.25)",
    rules: [
      {
        label: "Antibiotics",
        detail: "Wait 14 days after completing a course of antibiotics.",
      },
      {
        label: "Aspirin",
        detail:
          "Wait 48 hours if donating platelets; no waiting period for whole blood.",
      },
      {
        label: "Blood Thinners",
        detail:
          "Not eligible while on anticoagulants such as warfarin or rivaroxaban.",
      },
      {
        label: "Alcohol",
        detail: "Avoid alcohol for at least 24 hours before donation.",
      },
      {
        label: "Vaccinations",
        detail:
          "Most vaccines require a waiting period of 14–28 days. Flu vaccine: 24 hours.",
      },
      {
        label: "Acutane / Isotretinoin",
        detail: "Wait 1 month after last dose.",
      },
    ],
  },
  {
    title: "Travel & Tattoos",
    icon: "✈️",
    color: "#c01832",
    bg: "rgba(192,24,50,0.08)",
    border: "rgba(192,24,50,0.25)",
    rules: [
      {
        label: "Tattoos",
        detail:
          "Wait 6 months after getting a tattoo in a non-regulated facility; 3 months for regulated studios.",
      },
      {
        label: "Piercings",
        detail:
          "Wait 6 months after body piercing with shared or non-sterile equipment.",
      },
      {
        label: "International Travel",
        detail:
          "Travel to malaria-risk areas requires a 3-month deferral after return.",
      },
      {
        label: "Needle Use",
        detail:
          "Intravenous drug users and those with needlestick exposures are indefinitely deferred.",
      },
    ],
  },
];

export default function DonorDashboard() {
  const navigate = useNavigate();

  // -------------------------------------------------------
  // UI state
  // -------------------------------------------------------
  const handleAvailabilityChange = async (
    newAvailability: DonorAvailability,
  ) => {
    try {
      await apiRequest("/api/users/me/availability", {
        method: "PATCH",
        body: JSON.stringify({
          availability: newAvailability,
        }),
      });

      setAvailability(newAvailability);
      setShowAvailMenu(false);

      setToast(`Availability changed to ${newAvailability.toLowerCase()}.`);

      setTimeout(() => {
        setToast(null);
      }, 3000);
    } catch (error) {
      console.error("Failed to update availability:", error);

      setToast(
        error instanceof Error
          ? error.message
          : "Failed to update availability.",
      );

      setTimeout(() => {
        setToast(null);
      }, 4000);
    }
  };
  const [tab, setTab] = useState<Tab>("overview");

  const [availability, setAvailability] =
    useState<DonorAvailability>("AVAILABLE");

  const [showAvailMenu, setShowAvailMenu] = useState(false);

  const [toast, setToast] = useState<string | null>(null);

  const [openCategory, setOpenCategory] = useState<string | null>(
    "Basic Eligibility",
  );

  // -------------------------------------------------------
  // Backend data
  // -------------------------------------------------------

  const [donor, setDonor] = useState<DonorProfile | null>(null);

  const [donorRequests, setDonorRequests] = useState<DonorRequest[]>([]);

  const [loading, setLoading] = useState(true);

  const [requestLoading, setRequestLoading] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  // -------------------------------------------------------
  // Current availability
  // -------------------------------------------------------

  const currentAvail =
    availabilityOptions.find((o) => o.key === availability) ??
    availabilityOptions[0];

  // -------------------------------------------------------
  // Load donor dashboard
  // -------------------------------------------------------

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError(null);

      // -----------------------------------------------
      // Get logged-in donor
      // -----------------------------------------------

      const user = await getCurrentUser();

      const donorData = user as DonorProfile;

      setDonor(donorData);

      // -----------------------------------------------
      // Get donor availability
      // -----------------------------------------------

      const donorAvailability = donorData.availability;

      if (
        donorAvailability === "AVAILABLE" ||
        donorAvailability === "BUSY" ||
        donorAvailability === "UNAVAILABLE"
      ) {
        setAvailability(donorAvailability);
      }

      // -----------------------------------------------
      // Get donor requests
      // -----------------------------------------------

      const requests = await apiRequest<DonorRequest[]>("/api/donor-requests");

      setDonorRequests(requests);
    } catch (err) {
      console.error("Failed to load donor dashboard:", err);

      setError(
        err instanceof Error ? err.message : "Failed to load donor dashboard",
      );
    } finally {
      setLoading(false);
    }
  }

  // -------------------------------------------------------
  // Accept donor request
  // -------------------------------------------------------

  async function handleAccept(donorRequestId: string) {
    try {
      setRequestLoading(donorRequestId);

      const updatedRequest = await apiRequest<DonorRequest>(
        `/api/donor-requests/${donorRequestId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            action: "ACCEPT",
          }),
        },
      );

      // Update the request in local state
      setDonorRequests((previous) =>
        previous.map((request) =>
          request.id === donorRequestId ? updatedRequest : request,
        ),
      );

      setToast("✓ Response recorded. The hospital has been notified.");

      setTimeout(() => {
        setToast(null);
      }, 4000);
    } catch (err) {
      console.error("Failed to accept donor request:", err);

      setToast(err instanceof Error ? err.message : "Failed to accept request");

      setTimeout(() => {
        setToast(null);
      }, 4000);
    } finally {
      setRequestLoading(null);
    }
  }

  // -------------------------------------------------------
  // Decline donor request
  // -------------------------------------------------------

  async function handleDecline(donorRequestId: string) {
    try {
      setRequestLoading(donorRequestId);

      const updatedRequest = await apiRequest<DonorRequest>(
        `/api/donor-requests/${donorRequestId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            action: "DECLINE",
          }),
        },
      );

      // Update local state
      setDonorRequests((previous) =>
        previous.map((request) =>
          request.id === donorRequestId ? updatedRequest : request,
        ),
      );

      setToast("Response recorded. Thank you.");

      setTimeout(() => {
        setToast(null);
      }, 3000);
    } catch (err) {
      console.error("Failed to decline donor request:", err);

      setToast(
        err instanceof Error ? err.message : "Failed to decline request",
      );

      setTimeout(() => {
        setToast(null);
      }, 4000);
    } finally {
      setRequestLoading(null);
    }
  }

  // -------------------------------------------------------
  // Logout
  // -------------------------------------------------------

  function handleLogout() {
    logout();

    navigate("/roles", {
      replace: true,
    });
  }

  // -------------------------------------------------------
  // Donor information helpers
  // -------------------------------------------------------

  const donorName = donor?.name ?? "Donor";

  const donorBloodGroup = donor?.bloodGroup ?? donor?.blood_group ?? "—";

  const donationCount =
    donor?.donationCount ?? donor?.donation_count ?? donorHistory.length;

  const trustScore = donor?.trustScore ?? donor?.trust_score ?? 50;

  const initials = donorName
    .split(" ")
    .filter(Boolean)
    .map((name) => name[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // -------------------------------------------------------
  // Requests
  // -------------------------------------------------------

  const pendingRequests = donorRequests.filter(
    (request) => request.status === "PENDING",
  );

  const acceptedRequests = donorRequests.filter(
    (request) => request.status === "ACCEPTED",
  );

  const declinedRequests = donorRequests.filter(
    (request) => request.status === "DECLINED",
  );

  // -------------------------------------------------------
  // Tabs
  // -------------------------------------------------------

  const tabs: {
    key: Tab;
    label: string;
    icon: string;
  }[] = [
    {
      key: "overview",
      label: "Overview",
      icon: "🩸",
    },
    {
      key: "history",
      label: "Donation History",
      icon: "📋",
    },
    {
      key: "requirements",
      label: "Requirements",
      icon: "📋",
    },
  ];

  // -------------------------------------------------------
  // Loading state
  // -------------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen bg-bb-bg text-bb-text flex items-center justify-center">
        <div className="text-center">
          <div className="size-10 border-4 border-bb-border border-t-bb-crimson rounded-full animate-spin mx-auto mb-4" />

          <p className="font-semibold text-bb-text">
            Loading donor dashboard...
          </p>

          <p className="text-sm text-bb-muted mt-1">
            Fetching your requests and profile.
          </p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------
  // Main dashboard
  // -------------------------------------------------------

  return (
    <div className="min-h-screen bg-bb-bg text-bb-text flex flex-col">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="glass border-b border-bb-border sticky top-0 z-30">
        <div className="flex items-center justify-between px-4 sm:px-6 h-14">
          {/* Left */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="size-8 rounded-lg border border-bb-border flex items-center justify-center text-bb-muted hover:text-bb-text transition-colors"
              aria-label="Back to role select"
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
            </button>

            {/* Donor */}
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-full bg-bb-indigo/10 border border-bb-indigo/30 flex items-center justify-center font-bold text-bb-indigo text-xs">
                {initials}
              </div>

              <span className="hidden md:block text-sm font-medium text-bb-text">
                {donorName}
              </span>

              <button
                type="button"
                onClick={handleLogout}
                className="ml-1 flex items-center gap-2 px-3 py-2 rounded-lg border border-bb-border text-bb-muted text-sm font-semibold hover:text-bb-crimson hover:border-bb-crimson/40 transition-colors"
                aria-label="Logout"
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
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h5a2 2 0 012 2v1"
                  />
                </svg>

                <span className="hidden sm:block">Logout</span>
              </button>
            </div>
          </div>

          {/* Desktop tabs */}
          <nav
            className="hidden sm:flex items-center gap-1"
            role="tablist"
            aria-label="Donor sections"
          >
            {tabs.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  tab === t.key
                    ? "bg-bb-crimson/10 text-bb-crimson border border-bb-crimson/25 font-semibold"
                    : "text-bb-muted hover:text-bb-text hover:bg-bb-surface"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {/* Availability */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full border cursor-pointer select-none"
            style={{
              background: currentAvail.bg,
              borderColor: currentAvail.border,
            }}
            onClick={() => setShowAvailMenu(!showAvailMenu)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                setShowAvailMenu(!showAvailMenu);
              }
            }}
            aria-label={`Status: ${currentAvail.label}. Click to change.`}
          >
            <span
              className="size-2 rounded-full animate-blink"
              style={{
                background: currentAvail.color,
              }}
              aria-hidden="true"
            />

            <span
              className="font-mono text-xs font-bold"
              style={{
                color: currentAvail.color,
              }}
            >
              {currentAvail.label.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Mobile tabs */}
        <div
          className="sm:hidden flex border-t border-bb-border"
          role="tablist"
          aria-label="Donor sections"
        >
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 text-xs font-medium border-b-2 transition-all ${
                tab === t.key
                  ? "border-bb-crimson text-bb-crimson"
                  : "border-transparent text-bb-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* =====================================================
          AVAILABILITY DROPDOWN
      ===================================================== */}

      {showAvailMenu && (
        <div
          className="fixed top-16 right-4 z-50 glass rounded-xl shadow-lg w-56 border border-bb-border overflow-hidden animate-slide-up"
          role="menu"
        >
          {availabilityOptions
            .filter((option) => option.key !== availability)
            .map((option) => (
              <button
                key={option.key}
                role="menuitem"
                onClick={() => handleAvailabilityChange(option.key)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bb-surface transition-colors text-left border-b border-bb-border last:border-0"
              >
                <span
                  className="font-bold text-lg"
                  style={{
                    color: option.color,
                  }}
                >
                  {option.icon}
                </span>

                <div>
                  <p className="text-sm font-semibold text-bb-text">
                    {option.label}
                  </p>

                  <p className="text-xs text-bb-muted">{option.desc}</p>
                </div>
              </button>
            ))}
        </div>
      )}

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">
          {/* Error */}
          {error && (
            <div
              className="rounded-xl border p-4"
              style={{
                borderColor: "rgba(192,24,50,0.35)",
                background: "rgba(192,24,50,0.05)",
              }}
            >
              <p className="font-semibold text-bb-crimson">
                Unable to load dashboard
              </p>

              <p className="text-sm text-bb-muted mt-1">{error}</p>

              <button
                onClick={loadDashboard}
                className="mt-3 px-4 py-2 rounded-lg bg-bb-crimson text-white text-sm font-semibold"
              >
                Retry
              </button>
            </div>
          )}

          {/* =================================================
              OVERVIEW
          ================================================= */}

          {tab === "overview" && (
            <>
              <div>
                <h1 className="text-2xl font-bold text-bb-text">Your Impact</h1>

                <p className="text-sm text-bb-muted mt-1">
                  Thank you for being part of the blood donation network.
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    icon: "🩸",
                    label: "Blood Group",
                    value: donorBloodGroup,
                    color: "#c01832",
                  },
                  {
                    icon: "❤️",
                    label: "Requests",
                    value: String(donorRequests.length),
                    color: "#818cf8",
                  },
                  {
                    icon: "📍",
                    label: "Radius",
                    value: "15 km",
                    color: "#00bfb3",
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-bb-border bg-bb-surface p-4 text-center"
                  >
                    <p className="text-2xl mb-1" aria-hidden="true">
                      {stat.icon}
                    </p>

                    <p
                      className="font-mono font-bold text-lg"
                      style={{
                        color: stat.color,
                      }}
                    >
                      {stat.value}
                    </p>

                    <p className="text-xs text-bb-muted mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Availability */}
              <section className="rounded-2xl border border-bb-border bg-bb-surface p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-bb-text">
                    Availability Status
                  </h2>

                  <button
                    onClick={() => setShowAvailMenu(!showAvailMenu)}
                    className="text-xs font-mono text-bb-muted hover:text-bb-text transition-colors border border-bb-border rounded-lg px-2.5 py-1 hover:border-bb-border-light bg-white"
                  >
                    Change
                  </button>
                </div>

                <div
                  className="flex items-center gap-4 p-4 rounded-xl transition-all"
                  style={{
                    background: currentAvail.bg,
                    border: `1px solid ${currentAvail.border}`,
                  }}
                >
                  <div
                    className="size-14 rounded-full flex items-center justify-center text-2xl font-bold"
                    style={{
                      background: `${currentAvail.color}15`,
                      border: `2px solid ${currentAvail.color}`,
                    }}
                  >
                    <span
                      className="animate-blink"
                      style={{
                        color: currentAvail.color,
                      }}
                    >
                      {currentAvail.icon}
                    </span>
                  </div>

                  <div>
                    <p
                      className="font-bold text-lg"
                      style={{
                        color: currentAvail.color,
                      }}
                    >
                      {currentAvail.label}
                    </p>

                    <p className="text-sm text-bb-muted">{currentAvail.desc}</p>
                  </div>
                </div>
              </section>

              {/* =================================================
                  PENDING REQUESTS
              ================================================= */}

              {availability === "AVAILABLE" && pendingRequests.length > 0 && (
                <section className="space-y-4">
                  {pendingRequests.map((request) => (
                    <section
                      key={request.id}
                      className="rounded-2xl p-5 border animate-slide-up"
                      style={{
                        borderColor: "rgba(192,24,50,0.35)",
                        background: "rgba(192,24,50,0.04)",
                      }}
                      role="alert"
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <span
                          className="size-2 rounded-full bg-bb-crimson animate-blink"
                          aria-hidden="true"
                        />

                        <p className="font-mono text-xs font-bold tracking-widest text-bb-crimson uppercase">
                          Verified Hospital Request
                        </p>
                      </div>

                      <div className="flex items-start gap-4 mb-4">
                        <div
                          className="size-14 rounded-2xl flex items-center justify-center font-mono font-bold text-bb-crimson text-sm shrink-0"
                          style={{
                            background: "rgba(192,24,50,0.10)",
                            border: "1px solid rgba(192,24,50,0.30)",
                          }}
                        >
                          {request.blood_group}
                        </div>

                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-bb-text">
                              Blood Required
                            </span>

                            {request.urgency && (
                              <UrgencyBadge urgency={request.urgency as any} />
                            )}
                          </div>

                          <p className="text-sm text-bb-muted">
                            {request.hospital_name ?? "Hospital"}
                          </p>

                          {request.patient_reference && (
                            <p className="text-xs text-bb-muted">
                              Patient: {request.patient_reference}
                            </p>
                          )}

                          <div className="flex gap-4 flex-wrap font-mono text-xs text-bb-muted">
                            <span>📍 {request.distance} km away</span>

                            <span>
                              🩸 {request.units_required ?? "—"} unit
                              {request.units_required === 1 ? "" : "s"}
                            </span>

                            <span>
                              🕐 {new Date(request.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Match score */}
                      <div
                        className="rounded-xl border p-3 mb-4"
                        style={{
                          background: "rgba(129,140,248,0.08)",
                          borderColor: "rgba(129,140,248,0.25)",
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-bb-indigo font-semibold">
                            Your Match Score
                          </p>

                          <p className="font-mono font-bold text-bb-indigo text-xl">
                            {request.match_score}%
                          </p>
                        </div>

                        <div className="mt-2 progress-bar">
                          <div
                            className="progress-fill bg-bb-indigo"
                            style={{
                              width: `${Math.min(
                                Math.max(request.match_score, 0),
                                100,
                              )}%`,
                            }}
                          />
                        </div>

                        <div className="flex justify-between mt-2 text-xs text-bb-muted">
                          <span>Distance: {request.distance} km</span>

                          <span>Trust: {request.trust_score}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAccept(request.id)}
                          disabled={requestLoading === request.id}
                          className="flex-1 py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
                          style={{
                            background: "rgba(0,191,179,0.12)",
                            border: "1px solid rgba(0,191,179,0.40)",
                            color: "#00bfb3",
                          }}
                        >
                          {requestLoading === request.id
                            ? "Processing..."
                            : "I Can Help"}
                        </button>

                        <button
                          onClick={() => handleDecline(request.id)}
                          disabled={requestLoading === request.id}
                          className="flex-1 py-3 rounded-xl border border-bb-border text-bb-muted font-semibold text-sm hover:text-bb-text hover:border-bb-border-light transition-colors bg-white disabled:opacity-50"
                        >
                          Not Available
                        </button>
                      </div>
                    </section>
                  ))}
                </section>
              )}

              {/* No pending requests */}
              {availability === "AVAILABLE" && pendingRequests.length === 0 && (
                <section className="rounded-2xl border border-bb-border bg-bb-surface p-6 text-center">
                  <div className="size-12 rounded-full bg-bb-green/10 border border-bb-green/25 flex items-center justify-center mx-auto mb-3">
                    <svg
                      className="size-6 text-bb-green"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>

                  <p className="font-bold text-bb-text">No pending requests</p>

                  <p className="text-sm text-bb-muted mt-1">
                    You're available and ready to help when a compatible request
                    arrives.
                  </p>
                </section>
              )}

              {/* Busy / unavailable */}
              {availability !== "AVAILABLE" && (
                <section className="rounded-2xl border border-bb-border bg-bb-surface p-6 text-center">
                  <div className="size-12 rounded-full bg-bb-amber/10 border border-bb-amber/25 flex items-center justify-center mx-auto mb-3 text-xl">
                    {currentAvail.icon}
                  </div>

                  <p className="font-bold text-bb-text">
                    You are currently {currentAvail.label.toLowerCase()}
                  </p>

                  <p className="text-sm text-bb-muted mt-1">
                    Change your availability to Available to respond to blood
                    requests.
                  </p>
                </section>
              )}

              {/* Request summary */}
              {donorRequests.length > 0 && (
                <section className="rounded-2xl border border-bb-border bg-bb-surface p-5">
                  <h2 className="font-bold text-bb-text mb-4">
                    Request Summary
                  </h2>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className="font-mono text-xl font-bold text-bb-amber">
                        {pendingRequests.length}
                      </p>
                      <p className="text-xs text-bb-muted">Pending</p>
                    </div>

                    <div className="text-center">
                      <p className="font-mono text-xl font-bold text-bb-green">
                        {acceptedRequests.length}
                      </p>
                      <p className="text-xs text-bb-muted">Accepted</p>
                    </div>

                    <div className="text-center">
                      <p className="font-mono text-xl font-bold text-bb-crimson">
                        {declinedRequests.length}
                      </p>
                      <p className="text-xs text-bb-muted">Declined</p>
                    </div>
                  </div>
                </section>
              )}

              {/* Next eligibility */}
              <section
                className="rounded-2xl border p-5"
                style={{
                  borderColor: "rgba(245,158,11,0.30)",
                  background: "rgba(245,158,11,0.05)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="size-10 rounded-xl flex items-center justify-center text-bb-amber"
                    style={{
                      background: "rgba(245,158,11,0.10)",
                      border: "1px solid rgba(245,158,11,0.30)",
                    }}
                  >
                    📅
                  </div>

                  <div>
                    <p className="font-semibold text-bb-text">
                      Donation Eligibility
                    </p>

                    <p className="font-mono text-xs text-bb-amber mt-0.5">
                      Based on your last recorded donation
                    </p>
                  </div>

                  <button
                    onClick={() => setTab("requirements")}
                    className="ml-auto text-xs text-bb-muted hover:text-bb-text transition-colors underline underline-offset-2"
                  >
                    View rules
                  </button>
                </div>
              </section>
            </>
          )}

          {/* =================================================
              DONATION HISTORY
          ================================================= */}

          {tab === "history" && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-bb-text">
                    Donation History
                  </h1>

                  <p className="text-sm text-bb-muted mt-0.5">
                    {donorHistory.length} donations recorded
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-mono text-2xl font-bold text-bb-crimson">
                    {donationCount}
                  </p>

                  <p className="text-xs text-bb-muted">Total Donations</p>
                </div>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    label: "This Year",
                    value: "2",
                    color: "#00bfb3",
                  },
                  {
                    label: "Last Year",
                    value: "2",
                    color: "#818cf8",
                  },
                  {
                    label: "All Time",
                    value: String(donationCount),
                    color: "#c01832",
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl border border-bb-border bg-bb-surface p-3 text-center"
                  >
                    <p
                      className="font-mono font-bold text-xl"
                      style={{
                        color: stat.color,
                      }}
                    >
                      {stat.value}
                    </p>

                    <p className="text-xs text-bb-muted mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* History */}
              <div className="rounded-2xl border border-bb-border bg-white overflow-hidden">
                {donorHistory.map((donation, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-4 px-5 py-4 ${
                      index < donorHistory.length - 1
                        ? "border-b border-bb-border"
                        : ""
                    }`}
                  >
                    <div
                      className="size-10 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: "rgba(16,185,129,0.10)",
                        border: "1px solid rgba(16,185,129,0.30)",
                      }}
                    >
                      <svg
                        className="size-5 text-bb-green"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 00-1.414-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-bb-text text-sm truncate">
                        {donation.hospital}
                      </p>

                      <p className="text-xs text-bb-muted">
                        {donation.city} · {donation.date}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="inline-block font-mono text-xs font-bold text-bb-crimson bg-bb-crimson/10 border border-bb-crimson/25 rounded-full px-2 py-0.5">
                        {donation.group}
                      </span>

                      <p className="text-xs text-bb-green mt-1">
                        {donation.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="rounded-2xl border border-bb-border bg-bb-surface p-5 text-center">
                <p className="text-sm text-bb-muted">Ready to donate again?</p>

                <p className="font-mono text-xs text-bb-amber mt-1">
                  Check your eligibility before donating.
                </p>

                <button
                  onClick={() => setTab("requirements")}
                  className="mt-3 px-5 py-2 rounded-xl text-sm font-semibold transition-colors"
                  style={{
                    background: "rgba(192,24,50,0.10)",
                    border: "1px solid rgba(192,24,50,0.30)",
                    color: "#c01832",
                  }}
                >
                  View Requirements
                </button>
              </div>
            </>
          )}

          {/* =================================================
              REQUIREMENTS
          ================================================= */}

          {tab === "requirements" && (
            <>
              <div>
                <h1 className="text-2xl font-bold text-bb-text">
                  Donation Requirements
                </h1>

                <p className="text-sm text-bb-muted mt-1">
                  Review these eligibility criteria before each donation.
                  Requirements may vary slightly by location.
                </p>
              </div>

              {/* Checklist */}
              <div className="rounded-2xl border border-bb-border bg-bb-surface p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-bb-muted mb-3">
                  Quick Eligibility Checklist
                </p>

                <div className="grid sm:grid-cols-2 gap-2">
                  {[
                    "Age 18–65 years",
                    "Weight ≥ 50 kg",
                    "No active illness today",
                    "Last donation ≥ 90 days ago",
                    "Not pregnant or breastfeeding",
                    "No antibiotics in last 14 days",
                    "No tattoo in last 6 months",
                    "Hemoglobin within normal range",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-2 text-sm text-bb-dim"
                    >
                      <svg
                        className="size-4 text-bb-green shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0L3.293 10.293a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>

                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Categories */}
              <div className="space-y-3">
                {requirementCategories.map((category) => {
                  const isOpen = openCategory === category.title;

                  return (
                    <div
                      key={category.title}
                      className="rounded-2xl border overflow-hidden transition-all"
                      style={{
                        borderColor: isOpen ? category.border : "#e2e8f0",
                      }}
                    >
                      <button
                        onClick={() =>
                          setOpenCategory(isOpen ? null : category.title)
                        }
                        className="w-full flex items-center gap-3 px-5 py-4 text-left"
                        style={{
                          background: isOpen ? category.bg : "white",
                        }}
                        aria-expanded={isOpen}
                      >
                        <span className="text-xl shrink-0" aria-hidden="true">
                          {category.icon}
                        </span>

                        <span className="flex-1 font-semibold text-bb-text">
                          {category.title}
                        </span>

                        <span className="font-mono text-xs text-bb-muted shrink-0">
                          {category.rules.length} rules
                        </span>

                        <svg
                          className="size-4 text-bb-muted shrink-0 transition-transform"
                          style={{
                            transform: isOpen
                              ? "rotate(180deg)"
                              : "rotate(0deg)",
                          }}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>

                      {isOpen && (
                        <div
                          className="border-t px-5 pb-4 pt-3 space-y-3 animate-slide-up bg-white"
                          style={{
                            borderColor: category.border,
                          }}
                        >
                          {category.rules.map((rule) => (
                            <div key={rule.label} className="flex gap-3">
                              <div
                                className="mt-0.5 size-5 rounded-full shrink-0 flex items-center justify-center"
                                style={{
                                  background: category.bg,
                                  border: `1px solid ${category.border}`,
                                }}
                              >
                                <span
                                  className="size-1.5 rounded-full"
                                  style={{
                                    background: category.color,
                                  }}
                                />
                              </div>

                              <div>
                                <p className="text-sm font-semibold text-bb-text">
                                  {rule.label}
                                </p>

                                <p className="text-xs text-bb-muted leading-relaxed mt-0.5">
                                  {rule.detail}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Disclaimer */}
              <div className="rounded-xl border border-bb-border bg-bb-surface p-4">
                <p className="text-xs text-bb-muted leading-relaxed">
                  <strong className="text-bb-dim">Disclaimer:</strong> These are
                  general guidelines. Final eligibility is determined by a
                  qualified medical professional during the donation screening
                  process. Always consult your local blood bank or hospital for
                  location-specific requirements.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* =====================================================
          TOAST
      ===================================================== */}

      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl px-5 py-3 text-sm font-semibold animate-slide-up shadow-lg border"
          style={{
            background: "white",
            borderColor: "rgba(0,191,179,0.40)",
            color: "#00bfb3",
          }}
          role="status"
          aria-live="polite"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
