import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createBloodRequest } from "../services/requestService";
import { logout } from "../services/authService";
import type {
  BloodGroup,
  BloodRequest,
  Donor,
  Urgency,
} from "../types";

import { getHospitalRequests } from "../services/requestService";

import UrgencyBadge from "../components/UrgencyBadge";
import BloodGroupBadge from "../components/BloodGroupBadge";
import RequestTimeline from "../components/RequestTimeline";
import DonorMatchCard from "../components/DonorMatchCard";
import CreateRequestFlow from "../components/CreateRequestFlow";
import BloodFlowNetwork from "../components/BloodFlowNetwork";

import { mockNotifications } from "../data/mock";


/* =========================================================
   STATUS LABEL
========================================================= */

function StatusLabel({
  status,
}: {
  status: BloodRequest["status"];
}) {
  const map: Record<
    string,
    {
      text: string;
      color: string;
    }
  > = {
    CHECKING_BLOOD_BANK: {
      text: "Scanning Banks",
      color: "#f59e0b",
    },

    PARTIAL_FULFILLMENT: {
      text: "Partial",
      color: "#818cf8",
    },

    DONOR_MATCHING: {
      text: "Donor Matching",
      color: "#818cf8",
    },

    FULFILLED: {
      text: "Fulfilled",
      color: "#10b981",
    },

    CONFIRMED: {
      text: "Confirmed",
      color: "#10b981",
    },

    VERIFIED: {
      text: "Verified",
      color: "#38bdf8",
    },

    PENDING: {
      text: "Pending",
      color: "#5a7499",
    },
  };

  const c = map[status] ?? {
    text: status,
    color: "#5a7499",
  };

  return (
    <span
      className="inline-flex items-center gap-1.5 font-mono text-xs font-bold"
      style={{ color: c.color }}
    >
      <span
        className="size-1.5 rounded-full animate-blink"
        style={{ background: c.color }}
        aria-hidden="true"
      />

      {c.text}
    </span>
  );
}


/* =========================================================
   API REQUEST → FRONTEND REQUEST MAPPER
========================================================= */

function mapApiRequestToBloodRequest(
  request: Awaited<
    ReturnType<typeof getHospitalRequests>
  >[number],
): BloodRequest {
  const createdDate = new Date(request.created_at);

  const formattedTime = createdDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isFulfilled =
    request.status === "FULFILLED" ||
    request.status === "CONFIRMED";

  const timeline = [
    {
      event: "Request Created",
      time: formattedTime,
      completed: true,
    },

    {
      event: "Hospital Verification",
      time: formattedTime,
      completed: true,
    },

    {
      event: "Scanning Blood Banks",
      time: formattedTime,
      completed:
        request.status !== "CHECKING_BLOOD_BANK",
      active:
        request.status === "CHECKING_BLOOD_BANK",
    },

    {
      event: "Fulfillment",
      time: isFulfilled ? formattedTime : "—",
      completed: isFulfilled,
      active:
        request.status === "PARTIAL_FULFILLMENT" ||
        request.status === "DONOR_MATCHING",
    },
  ];

  const donorMatches =
    request.donors ?? request.donor_matches ?? [];

  const donors: Donor[] = donorMatches.map((donor) => ({
    id: donor.donor_id,
    name: donor.name,
    bloodGroup: donor.blood_group,
    availability: donor.availability,
    distance: donor.distance,
    matchScore: donor.match_score,
    responses: donor.donation_count,
    lastDonation: "Not available",
    scores: {
      compatibility: 100,
      eligibility: 100,
      distance: Math.max(0, Math.min(100, 100 - donor.distance * 4)),
      availability: donor.availability === "AVAILABLE" ? 100 : 0,
      reliability: donor.trust_score,
    },
  }));

  return {
    id: request.id,

    bloodGroup: request.blood_group,

    unitsRequired: request.units_required,

    urgency: request.urgency,

    status: request.status as BloodRequest["status"],

    hospital:
      request.hospital_name || "Hospital",

    createdAt: request.created_at,

    bloodBankUnits: request.blood_bank_units,

    donorUnits: request.donor_units,

    remainingUnits: request.remaining_units,

    donors,

    timeline,
  };
}


/* =========================================================
   HOSPITAL DASHBOARD
========================================================= */

export default function HospitalDashboard() {
  const navigate = useNavigate();


  /* =======================================================
     REQUEST STATE
  ======================================================= */

  const [requests, setRequests] = useState<BloodRequest[]>(
    [],
  );

  const [selectedReq, setSelectedReq] =
    useState<BloodRequest | null>(null);

  const [loadingRequests, setLoadingRequests] =
    useState(true);

  const [requestError, setRequestError] =
    useState<string | null>(null);


  /* =======================================================
     UI STATE
  ======================================================= */

  const [showCreate, setShowCreate] =
    useState(false);

  const [showNotif, setShowNotif] =
    useState(false);

  const [notifications, setNotifications] =
    useState(mockNotifications);

  const [activeTab, setActiveTab] = useState<
    "timeline" | "donors" | "network"
  >("timeline");


  /* =======================================================
     LOAD REAL HOSPITAL REQUESTS
  ======================================================= */

  useEffect(() => {
    async function loadRequests() {
      try {
        setLoadingRequests(true);

        setRequestError(null);

        const data =
          await getHospitalRequests();

        const mappedRequests =
          data.map(mapApiRequestToBloodRequest);

        setRequests(mappedRequests);

        setSelectedReq(
          mappedRequests[0] ?? null,
        );
      } catch (error) {
        console.error(
          "Failed to load hospital requests:",
          error,
        );

        setRequestError(
          error instanceof Error
            ? error.message
            : "Failed to load requests",
        );
      } finally {
        setLoadingRequests(false);
      }
    }

    loadRequests();
  }, []);


  /* =======================================================
     NOTIFICATION COUNT
  ======================================================= */

  const unreadCount =
    notifications.filter(
      (n) => !n.read,
    ).length;


  /* =======================================================
     CREATE REQUEST
     
     NOTE:
     This still uses the existing CreateRequestFlow
     callback for now.
     
     We will connect POST /api/requests in the
     next step.
  ======================================================= */

  const handleCreateRequest = async (data: {
  patientReference: string;
  bloodGroup: BloodGroup;
  unitsRequired: number;
  urgency: Urgency;
  notes?: string;
}) => {
  try {
    const createdRequest =
      await createBloodRequest({
        patient_reference:
          data.patientReference,

        blood_group:
          data.bloodGroup,

        units_required:
          data.unitsRequired,

        urgency:
          data.urgency,

        notes:
          data.notes,
      });

    const newRequest =
      mapApiRequestToBloodRequest(
        createdRequest,
      );

    setRequests((prev) => [
      newRequest,
      ...prev,
    ]);

    setSelectedReq(newRequest);

    setShowCreate(false);
  } catch (error) {
    console.error(
      "Failed to create blood request:",
      error,
    );

    throw error;
  }
};

  /* =======================================================
     NOTIFICATION COLORS
  ======================================================= */

  const notifColors: Record<
    string,
    string
  > = {
    CRITICAL: "#c01832",

    URGENT: "#f59e0b",

    INFO: "#38bdf8",

    SUCCESS: "#10b981",
  };


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div
      className="h-screen flex flex-col text-bb-text overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.88), rgba(255,255,255,0.88)), url('/hospital-bg.png')",
      }}
    >

      {/* =================================================
          TOP NAV
      ================================================= */}

      <header className="glass border-b border-bb-border shrink-0 z-30">
        <div className="flex items-center justify-between px-4 sm:px-6 h-14">

          <div className="flex items-center gap-3">

            <button
              type="button"
              onClick={() => navigate("/")}
              className="size-8 rounded-lg border border-bb-border flex items-center justify-center text-bb-muted hover:text-bb-text transition-colors"
              aria-label="Back to home"
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

            <div>
              <p className="font-bold text-sm text-bb-text">
                Hospital Command Center
              </p>

              <p className="font-mono text-xs text-bb-muted">
                Apollo Hospitals · Chennai
              </p>
            </div>

          </div>


          <div className="flex items-center gap-2">

            {/* LIVE */}

            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full border border-bb-teal/30 bg-bb-teal/10">

              <span
                className="size-1.5 rounded-full bg-bb-teal animate-blink"
                aria-hidden="true"
              />

              <span className="font-mono text-xs text-bb-teal font-bold">
                LIVE
              </span>

            </div>


            {/* NOTIFICATION */}

            <button
              type="button"
              onClick={() =>
                setShowNotif(!showNotif)
              }
              className="relative size-9 rounded-lg border border-bb-border flex items-center justify-center text-bb-muted hover:text-bb-text transition-colors"
              aria-label={`Notifications ${
                unreadCount > 0
                  ? `(${unreadCount} unread)`
                  : ""
              }`}
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
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>

              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 size-4 rounded-full bg-bb-crimson text-white text-xs flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}

            </button>


            {/* NEW REQUEST */}

            <button
              type="button"
              onClick={() =>
                setShowCreate(true)
              }
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bb-crimson border border-bb-crimson text-white text-sm font-bold hover:bg-bb-crimson-bright transition-colors"
            >
              <span aria-hidden="true">
                +
              </span>

              <span className="hidden sm:block">
                New Request
              </span>
            </button>

          </div>

        </div>
      </header>
<button
  type="button"
  onClick={() => {
    logout();
    navigate("/roles", { replace: true });
  }}
  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-bb-border text-bb-muted text-sm font-semibold hover:text-bb-crimson hover:border-bb-crimson/40 transition-colors"
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

  <span className="hidden sm:block">
    Logout
  </span>
</button>

      {/* =================================================
          METRIC STRIP
      ================================================= */}

      <div className="glass border-b border-bb-border shrink-0">

        <div className="flex overflow-x-auto divide-x divide-bb-border">

          {[
            {
              value: requests.length,
              label: "Active Requests",
              color: "#c01832",
              icon: "🔴",
            },

            {
              value: requests.reduce(
                (s, r) =>
                  s + r.unitsRequired,
                0,
              ),
              label: "Units in Motion",
              color: "#f59e0b",
              icon: "↑",
            },

            {
              value: 8,
              label: "Banks Connected",
              color: "#00bfb3",
              icon: "🏦",
            },

            {
              value: 126,
              label: "Donors Nearby",
              color: "#818cf8",
              icon: "🩸",
            },
          ].map((m) => (

            <div
              key={m.label}
              className="flex items-center gap-2.5 px-5 py-3 min-w-max"
            >

              <span
                className="text-sm"
                aria-hidden="true"
              >
                {m.icon}
              </span>

              <div>

                <p
                  className="font-mono font-bold text-lg leading-none"
                  style={{
                    color: m.color,
                  }}
                >
                  {m.value}
                </p>

                <p className="text-xs text-bb-muted mt-0.5">
                  {m.label}
                </p>

              </div>

            </div>

          ))}

        </div>

      </div>


      {/* =================================================
          MAIN GRID
      ================================================= */}

      <div className="flex-1 flex overflow-hidden min-h-0">


        {/* =================================================
            REQUEST LIST
        ================================================= */}

        <aside className="w-64 xl:w-72 border-r border-bb-border flex flex-col overflow-hidden shrink-0 hidden md:flex">

          <div className="p-3 border-b border-bb-border">

            <p className="font-mono text-xs uppercase tracking-widest text-bb-muted">
              Active Requests
            </p>

          </div>


          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">


            {/* LOADING */}

            {loadingRequests && (
              <div className="flex flex-col items-center justify-center h-40 text-center px-4">

                <div className="size-6 rounded-full border-2 border-bb-border border-t-bb-crimson animate-spin mb-3" />

                <p className="text-bb-muted text-sm font-semibold">
                  Loading requests...
                </p>

              </div>
            )}


            {/* ERROR */}

            {requestError &&
              !loadingRequests && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 mx-1">

                  <p className="text-red-600 text-sm font-semibold">
                    Unable to load requests
                  </p>

                  <p className="text-red-500 text-xs mt-1">
                    {requestError}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      window.location.reload()
                    }
                    className="mt-3 text-xs font-semibold text-red-600 hover:text-red-700"
                  >
                    Retry
                  </button>

                </div>
              )}


            {/* EMPTY */}

            {requests.length === 0 &&
              !loadingRequests &&
              !requestError && (
                <div className="flex flex-col items-center justify-center h-40 text-center px-4">

                  <p className="text-bb-muted text-sm font-semibold">
                    Network clear
                  </p>

                  <p className="text-bb-muted/60 text-xs mt-1">
                    New requests will appear here.
                  </p>

                </div>
              )}


            {/* REQUESTS */}

            {!loadingRequests &&
              requests.map((req) => (

                <button
                  type="button"
                  key={req.id}
                  onClick={() =>
                    setSelectedReq(req)
                  }
                  className={`w-full text-left rounded-xl p-3 transition-all border ${
                    selectedReq?.id ===
                    req.id
                      ? "bg-bb-panel border-bb-border-light"
                      : "border-transparent hover:bg-bb-surface hover:border-bb-border"
                  }`}
                >

                  <div className="flex items-center justify-between mb-2">

                    <BloodGroupBadge
                      group={req.bloodGroup}
                      size="sm"
                    />

                    <UrgencyBadge
                      urgency={req.urgency}
                      size="sm"
                    />

                  </div>


                  <div className="flex items-center justify-between">

                    <span className="font-mono text-sm font-bold text-bb-text">
                      {req.unitsRequired} units
                    </span>

                    <StatusLabel
                      status={req.status}
                    />

                  </div>


                  {req.bloodBankUnits >
                    0 && (
                    <div className="mt-2 progress-bar">

                      <div
                        className="progress-fill bg-bb-teal"
                        style={{
                          width: `${Math.min(
                            (req.bloodBankUnits /
                              req.unitsRequired) *
                              100,
                            100,
                          )}%`,
                        }}
                        aria-label={`${req.bloodBankUnits} of ${req.unitsRequired} units found`}
                      />

                    </div>
                  )}

                </button>

              ))}

          </div>

        </aside>


        {/* =================================================
            DETAIL PANEL
        ================================================= */}

        <main className="flex-1 flex flex-col overflow-hidden min-w-0">

          {selectedReq ? (

            <>

              {/* REQUEST HEADER */}

              <div className="glass-light border-b border-bb-border p-4 sm:p-5 shrink-0">

                <div className="flex flex-wrap items-start gap-4 justify-between">

                  <div className="flex items-center gap-3">

                    <BloodGroupBadge
                      group={selectedReq.bloodGroup}
                      size="lg"
                    />

                    <div>

                      <div className="flex items-center gap-2 flex-wrap">

                        <span className="font-mono text-2xl font-bold text-bb-text">
                          {selectedReq.unitsRequired} units
                        </span>

                        <UrgencyBadge
                          urgency={
                            selectedReq.urgency
                          }
                          size="md"
                        />

                      </div>

                      <p className="text-xs text-bb-muted mt-0.5 font-mono">
                        {selectedReq.hospital}
                      </p>

                    </div>

                  </div>


                  <StatusLabel
                    status={
                      selectedReq.status
                    }
                  />

                </div>


                {/* FULFILLMENT */}

                <div className="mt-4 grid sm:grid-cols-2 gap-3">

                  <div className="rounded-xl border border-bb-border bg-bb-surface p-3">

                    <div className="flex justify-between items-center mb-2">

                      <span className="text-xs text-bb-teal font-semibold">
                        Blood Bank Contribution
                      </span>

                      <span className="font-mono text-sm font-bold text-bb-teal">
                        {
                          selectedReq.bloodBankUnits
                        }
                        /
                        {
                          selectedReq.unitsRequired
                        }
                      </span>

                    </div>

                    <div className="progress-bar">

                      <div
                        className="progress-fill bg-bb-teal"
                        style={{
                          width: `${
                            selectedReq.unitsRequired >
                            0
                              ? Math.min(
                                  (selectedReq.bloodBankUnits /
                                    selectedReq.unitsRequired) *
                                    100,
                                  100,
                                )
                              : 0
                          }%`,
                        }}
                      />

                    </div>

                  </div>


                  <div className="rounded-xl border border-bb-border bg-bb-surface p-3">

                    <div className="flex justify-between items-center mb-2">

                      <span className="text-xs text-bb-indigo font-semibold">
                        Donor Network
                      </span>

                      <span className="font-mono text-sm font-bold text-bb-indigo">
                        {
                          selectedReq.remainingUnits
                        }{" "}
                        needed
                      </span>

                    </div>

                    <div className="progress-bar">

                      <div
                        className="progress-fill bg-bb-indigo"
                        style={{
                          width:
                            selectedReq.remainingUnits >
                            0
                              ? `${Math.min(
                                  (selectedReq.remainingUnits /
                                    selectedReq.unitsRequired) *
                                    100,
                                  100,
                                )}%`
                              : "0%",
                        }}
                      />

                    </div>

                  </div>

                </div>

              </div>


              {/* TABS */}

              <div className="flex border-b border-bb-border shrink-0">

                {(
                  [
                    "timeline",
                    "donors",
                    "network",
                  ] as const
                ).map((tab) => (

                  <button
                    type="button"
                    key={tab}
                    onClick={() =>
                      setActiveTab(tab)
                    }
                    className={`px-5 py-3 text-xs font-semibold uppercase tracking-widest transition-colors border-b-2 ${
                      activeTab === tab
                        ? "border-bb-crimson text-bb-crimson-bright"
                        : "border-transparent text-bb-muted hover:text-bb-dim"
                    }`}
                  >

                    {tab ===
                    "timeline"
                      ? "Journey"
                      : tab === "donors"
                        ? `Donors (${
                            selectedReq
                              .donors
                              ?.length ??
                            0
                          })`
                        : "Network View"}

                  </button>

                ))}

              </div>


              {/* TAB CONTENT */}

              <div className="flex-1 overflow-y-auto p-4 sm:p-5">

                {/* TIMELINE */}

                {activeTab ===
                  "timeline" && (

                  <div className="max-w-sm">

                    <RequestTimeline
                      events={
                        selectedReq.timeline
                      }
                    />

                  </div>
                )}


                {/* DONORS */}

                {activeTab ===
                  "donors" && (

                  <div className="space-y-3 max-w-xl">

                    {(selectedReq.donors
                      ?.length ?? 0) ===
                    0 ? (

                      <div className="text-center py-10">

                        <p className="text-bb-muted text-sm">
                          No donor matches yet
                          for this request.
                        </p>

                      </div>

                    ) : (

                      <>

                        <p className="text-xs text-bb-muted font-mono uppercase tracking-widest mb-4">
                          Compatibility &
                          Response Matrix
                        </p>

                        {selectedReq.donors!.map(
                          (d) => (

                            <DonorMatchCard
                              key={d.id}
                              donor={d}
                              viewMode="hospital"
                              onAccept={() => {}}
                              onDecline={() => {}}
                            />

                          ),
                        )}

                      </>
                    )}

                  </div>
                )}


                {/* NETWORK */}

                {activeTab ===
                  "network" && (

                  <div className="flex items-center justify-center min-h-48">

                    <BloodFlowNetwork
                      variant="compact"
                      requestStatus={
                        selectedReq.status
                      }
                    />

                  </div>
                )}

              </div>

            </>

          ) : (

            /* EMPTY DETAIL */

            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">

              <BloodFlowNetwork
                variant="compact"
              />

              <p className="font-semibold text-bb-text mt-6">
                {loadingRequests
                  ? "Loading your requests..."
                  : "The network is currently clear."}
              </p>

              <p className="text-bb-muted text-sm mt-2">

                {loadingRequests
                  ? "Fetching your latest blood requests."
                  : "New verified requests will appear here when created."}

              </p>

              {!loadingRequests && (
                <button
                  type="button"
                  onClick={() =>
                    setShowCreate(true)
                  }
                  className="mt-6 px-5 py-2.5 rounded-xl bg-bb-crimson/15 border border-bb-crimson/40 text-bb-crimson-bright text-sm font-semibold hover:bg-bb-crimson/25 transition-all"
                >
                  Create First Request
                </button>
              )}

            </div>

          )}

        </main>


        {/* =================================================
            NOTIFICATION PANEL
        ================================================= */}

        {showNotif && (

          <aside className="w-72 border-l border-bb-border flex flex-col overflow-hidden shrink-0 animate-slide-in-right absolute right-0 top-14 bottom-0 z-20 glass">

            <div className="flex items-center justify-between p-4 border-b border-bb-border">

              <p className="font-semibold text-sm text-bb-text">
                Notifications
              </p>

              <button
                type="button"
                onClick={() =>
                  setShowNotif(false)
                }
                className="text-bb-muted hover:text-bb-text transition-colors"
                aria-label="Close notifications"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

            </div>


            <div className="flex-1 overflow-y-auto p-3 space-y-2">

              {notifications.map(
                (n) => (

                  <div
                    key={n.id}
                    className={`rounded-xl p-3 border transition-all cursor-pointer ${
                      n.read
                        ? "border-bb-border bg-bb-surface/40"
                        : "border-bb-border-light bg-bb-panel"
                    }`}
                    onClick={() =>
                      setNotifications(
                        (prev) =>
                          prev.map(
                            (x) =>
                              x.id ===
                              n.id
                                ? {
                                    ...x,
                                    read: true,
                                  }
                                : x,
                          ),
                      )
                    }
                  >

                    <div className="flex items-start gap-2.5">

                      <span
                        className="size-2 rounded-full mt-1.5 shrink-0 animate-blink"
                        style={{
                          background:
                            notifColors[
                              n.type
                            ],

                          animationPlayState:
                            n.read
                              ? "paused"
                              : "running",
                        }}
                        aria-hidden="true"
                      />

                      <div>

                        <p className="text-xs font-bold text-bb-text">
                          {n.title}
                        </p>

                        <p className="text-xs text-bb-muted mt-0.5">
                          {n.message}
                        </p>

                        <p className="font-mono text-xs text-bb-muted/60 mt-1">
                          {n.time}
                        </p>

                      </div>

                    </div>

                  </div>

                ),
              )}

            </div>

          </aside>

        )}

      </div>


      {/* =================================================
          CREATE REQUEST MODAL
      ================================================= */}

      {showCreate && (

        <CreateRequestFlow
          onClose={() =>
            setShowCreate(false)
          }
          onSubmit={
            handleCreateRequest
          }
        />

      )}

    </div>
  );
}
