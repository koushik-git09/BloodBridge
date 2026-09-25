import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  confirmDonorDonation,
  createBloodRequest,
  getHospitalRequests,
  type CreateBloodRequestData,
} from "../services/requestService";
import { logout, getCurrentUser, type CurrentUser } from "../services/authService";
import type {
  BloodRequest,
  Donor,
  Notification,
  Urgency,
  BloodGroup,
} from "../types";

import HospitalStats from "../components/hospital/HospitalStats";
import HospitalRequestList from "../components/hospital/HospitalRequestList";
import HospitalRequestDetails from "../components/hospital/HospitalRequestDetails";
import NotificationCenter from "../components/common/NotificationCenter";
import CreateRequestFlow from "../components/CreateRequestFlow";
import { formatTime, formatDate } from "../utils/date";
import {
  enableNotifications,
  getBrowserNotificationPermission,
} from "../services/notificationService";


function mapApiRequestToBloodRequest(
  request: Awaited<ReturnType<typeof getHospitalRequests>>[number]
): BloodRequest {
  const formattedCreatedTime = formatTime(request.created_at);

  const isFulfilled =
    request.status === "FULFILLED" || request.status === "CONFIRMED";

  const donorMatches = request.donors ?? request.donor_matches ?? [];

  // Determine actual fulfillment timestamp
  let fulfillmentTimestamp = request.fulfilled_at || null;
  if (!fulfillmentTimestamp && isFulfilled) {
    const donatedDonor = donorMatches.find(
      (d) => d.status === "DONATED" && d.responded_at
    );
    if (donatedDonor?.responded_at) {
      fulfillmentTimestamp = donatedDonor.responded_at;
    } else if (request.updated_at && request.updated_at !== request.created_at) {
      fulfillmentTimestamp = request.updated_at;
    }
  }

  const formattedFulfilledTime = fulfillmentTimestamp
    ? formatTime(fulfillmentTimestamp)
    : isFulfilled
      ? formattedCreatedTime
      : "—";

  const timeline = [
    {
      event: "Request Created",
      time: formattedCreatedTime,
      completed: true,
    },
    {
      event: "Hospital Verification",
      time: formattedCreatedTime,
      completed: true,
    },
    {
      event: "Scanning Blood Banks",
      time: formattedCreatedTime,
      completed: request.status !== "CHECKING_BLOOD_BANK",
      active: request.status === "CHECKING_BLOOD_BANK",
    },
    {
      event: "Fulfillment",
      time: formattedFulfilledTime,
      completed: isFulfilled,
      active:
        request.status === "PARTIAL_FULFILLMENT" ||
        request.status === "DONOR_MATCHING",
    },
  ];

  const donors: Donor[] = donorMatches.map((d) => {
    const formattedLastDonation = d.last_donation
      ? formatDate(d.last_donation)
      : "No prior donation";

    return {
      id: d.donor_id,
      donorRequestId: d.donor_request_id ?? undefined,
      status: d.status,
      name: d.name,
      bloodGroup: d.blood_group,
      availability: d.availability,
      distance: d.distance,
      address: d.address ?? undefined,
      matchScore: d.match_score,
      responses: d.donation_count,
      lastDonation: formattedLastDonation,
      phone: d.phone ?? null,
      respondedAt: d.responded_at ?? null,
      scores: {
        compatibility: 100,
        eligibility: 100,
        distance: Math.max(0, Math.min(100, 100 - d.distance * 4)),
        availability: d.availability === "AVAILABLE" ? 100 : 0,
        reliability: d.trust_score,
      },
    };
  });

  const bloodBanks = (request.blood_banks || []).map((bb) => ({
    id: bb.id,
    bloodBankId: bb.blood_bank_id,
    bloodBankName: bb.blood_bank_name || "Blood Bank",
    bloodBankAddress: bb.blood_bank_address || undefined,
    bloodBankPhone: bb.blood_bank_phone || undefined,
    bloodGroup: bb.blood_group,
    unitsRequested: bb.units_requested,
    unitsConfirmed: bb.units_confirmed,
    status: bb.status,
    distance: bb.distance,
  }));

  return {
    id: request.id,
    bloodGroup: request.blood_group,
    unitsRequired: request.units_required,
    urgency: request.urgency as Urgency,
    status: request.status as BloodRequest["status"],
    hospital: request.hospital_name || "Hospital",
    hospitalAddress: request.hospital_address,
    patient_reference: request.patient_reference,
    createdAt: request.created_at,
    updatedAt: request.updated_at,
    fulfilledAt: request.fulfilled_at,

    bloodBankUnits: request.blood_bank_units,
    donorUnits: request.donor_units,
    remainingUnits: request.remaining_units,
    donors,
    bloodBanks,
    timeline,
  };
}


function deriveNotificationsFromRequests(requests: BloodRequest[]): Notification[] {
  const notifs: Notification[] = [];

  requests.forEach((req, idx) => {
    if (req.status === "FULFILLED") {
      notifs.push({
        id: `notif-ful-${req.id}-${idx}`,
        type: "SUCCESS",
        title: "Request Fulfilled",
        message: `${req.bloodGroup} requirement (${req.unitsRequired} units) fully secured.`,
        time: new Date(req.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        read: false,
      });
    }

    if (req.donors) {
      req.donors.forEach((donor) => {
        if (donor.status === "ACCEPTED") {
          notifs.push({
            id: `notif-acc-${donor.id}-${req.id}`,
            type: "SUCCESS",
            title: "Donor Accepted Request",
            message: `${donor.name} accepted ${req.bloodGroup} request (${donor.distance.toFixed(1)} km away). Ready for hospital confirmation.`,
            time: "Live",
            read: false,
          });
        }
      });
    }

    if (req.urgency === "CRITICAL" && req.remainingUnits > 0) {
      notifs.push({
        id: `notif-crit-${req.id}`,
        type: "CRITICAL",
        title: "Critical Blood Requirement",
        message: `${req.remainingUnits} units needed for ${req.bloodGroup} — Donor matching active.`,
        time: "Active",
        read: false,
      });
    }
  });

  return notifs;
}

export default function HospitalDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [selectedReq, setSelectedReq] = useState<BloodRequest | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3500);
  };

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [userData, apiRequests] = await Promise.all([
        getCurrentUser(),
        getHospitalRequests(),
      ]);

      setUser(userData);
      const mapped = apiRequests.map(mapApiRequestToBloodRequest);
      setRequests(mapped);

      setSelectedReq((current) => {
        if (!current && mapped.length > 0) return mapped[0];
        if (current) {
          const updated = mapped.find((r) => r.id === current.id);
          return updated ?? mapped[0] ?? null;
        }
        return null;
      });

      setNotifications(deriveNotificationsFromRequests(mapped));
    } catch (err) {
      console.error("Failed to load hospital requests:", err);
      setError(err instanceof Error ? err.message : "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    const perm = getBrowserNotificationPermission();
    if (perm === "granted") {
      enableNotifications().catch(() => {});
    }
  }, []);

  const handleCreateSubmit = async (data: {
    patientReference: string;
    bloodGroup: BloodGroup;
    unitsRequired: number;
    urgency: Urgency;
    notes?: string;
  }) => {
    if (!data.patientReference?.trim()) {
      showToast("Patient reference is required.");
      return;
    }

    const payload: CreateBloodRequestData = {
      blood_group: data.bloodGroup,
      units_required: data.unitsRequired,
      urgency: data.urgency,
      patient_reference: data.patientReference.trim(),
      notes: data.notes,
    };

    const newReq = await createBloodRequest(payload);
    setShowCreate(false);
    showToast("Blood request created! Scanned nearby blood banks and donors.");
    await loadRequests();

    const mappedNew = mapApiRequestToBloodRequest(newReq);
    setSelectedReq(mappedNew);
  };

  const handleConfirmDonation = async (requestId: string, donorRequestId: string) => {
    try {
      setConfirmingId(donorRequestId);
      await confirmDonorDonation(requestId, donorRequestId);
      showToast("Donation confirmed! Donor record and inventory updated.");
      await loadRequests();
    } catch (err) {
      console.error("Failed to confirm donation:", err);
      showToast(err instanceof Error ? err.message : "Failed to confirm donation");
    } finally {
      setConfirmingId(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login/hospital");
  };

  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bb-network-bg text-bb-text">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-2xl animate-in fade-in slide-in-from-bottom-3">
          {toast}
        </div>
      )}


      {/* Create Request Flow Modal */}
      {showCreate && (
        <CreateRequestFlow
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreateSubmit}
        />
      )}

      {/* Top Navbar */}
      <nav className="glass sticky top-0 z-40 border-b border-bb-border px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/bloodbridge-logo.png"
            alt="BloodBridge logo"
            className="size-8 object-contain"
          />
          <div>
            <span className="font-bold text-bb-text tracking-tight">
              Blood<span className="text-bb-crimson-bright">Bridge</span>
            </span>
            <span className="ml-2 rounded-md bg-bb-blue/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-bb-blue">
              Hospital Portal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <NotificationCenter
            onSelectNotification={(notif) => {
              const reqId = notif.data?.request_id;
              if (reqId) {
                const found = requests.find((r) => r.id === reqId);
                if (found) setSelectedReq(found);
              }
            }}
          />
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="rounded-xl bg-bb-crimson px-3.5 py-2 text-xs font-bold text-white hover:bg-bb-crimson-bright shadow-sm transition"
          >
            + Create Request
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl border border-bb-border px-3.5 py-2 text-xs font-semibold text-bb-muted hover:bg-white hover:text-bb-text transition"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Dashboard Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header Greeting */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-bb-text">
              {String(user?.hospitalName || user?.name || "Hospital Command Center")}
            </h1>
            {user?.location?.address && (
              <p className="mt-1 text-xs text-slate-700 font-medium flex items-center gap-1">
                <span className="text-bb-crimson">📍</span>
                <span>{user.location.address}</span>
              </p>
            )}
            <p className="mt-1 text-xs text-bb-muted">
              Real-time proximity blood matching with verified donors and nearby blood banks
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-bb-teal/10 border border-bb-teal/30 px-3 py-1 text-xs font-mono font-bold text-bb-teal uppercase tracking-wider">
              <span className="size-1.5 rounded-full bg-bb-teal animate-blink" />
              Live Operations
            </span>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={loadRequests}
              className="font-bold underline hover:text-red-900"
            >
              Retry
            </button>
          </div>
        )}

        {/* Statistics Metric Cards */}
        <HospitalStats requests={requests} />

        {/* 2-Column Command Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Requests List */}
          <div className="lg:col-span-4">
            <HospitalRequestList
              requests={requests}
              selectedId={selectedReq?.id ?? null}
              onSelect={(r) => setSelectedReq(r)}
              onCreateClick={() => setShowCreate(true)}
            />
          </div>

          {/* Right Column: Selected Request Details */}
          <div className="lg:col-span-8">
            <HospitalRequestDetails
              request={selectedReq}
              onConfirmDonation={handleConfirmDonation}
              confirmingDonorRequestId={confirmingId}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
