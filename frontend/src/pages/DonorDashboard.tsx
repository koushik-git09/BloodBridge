import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { logout, getCurrentUser, type CurrentUser } from "../services/authService";
import {
  getDonorRequests,
  respondToDonorRequest,
  getDonorDonationHistory,
  getDonorStatistics,
  type DonorRequest,
} from "../services/donorService";
import { apiRequest } from "../services/api";
import type { DonorAvailability, DonationRecord, DonorStatistics as DonorStatsType } from "../types";

import AvailabilitySelector from "../components/donor/AvailabilitySelector";
import DonorStats from "../components/donor/DonorStats";
import DonationHistory from "../components/donor/DonationHistory";
import DonorRequestsList from "../components/donor/DonorRequestsList";
import DonorEligibilityGuide from "../components/donor/DonorEligibilityGuide";

type Tab = "overview" | "history" | "requirements";

export default function DonorDashboard() {
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>("overview");
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [availability, setAvailability] = useState<DonorAvailability>("AVAILABLE");
  const [updatingAvailability, setUpdatingAvailability] = useState(false);

  const [requests, setRequests] = useState<DonorRequest[]>([]);
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [statistics, setStatistics] = useState<DonorStatsType | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3500);
  };

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [userData, requestsData, donationsData, statsData] = await Promise.all([
        getCurrentUser(),
        getDonorRequests(),
        getDonorDonationHistory().catch(() => [] as DonationRecord[]),
        getDonorStatistics().catch(() => null),
      ]);

      setUser(userData);
      if (userData.availability) {
        setAvailability(userData.availability as DonorAvailability);
      }

      setRequests(requestsData);
      setDonations(donationsData);
      setStatistics(statsData);
    } catch (err) {
      console.error("Failed to load donor dashboard:", err);
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleAvailabilityUpdate = async (newAvail: DonorAvailability) => {
    try {
      setUpdatingAvailability(true);
      await apiRequest("/api/users/me/availability", {
        method: "PATCH",
        body: JSON.stringify({ availability: newAvail }),
      });
      setAvailability(newAvail);
      showToast(`Availability updated to ${newAvail.toLowerCase()}`);
    } catch (err) {
      console.error("Failed to update availability:", err);
      showToast(err instanceof Error ? err.message : "Failed to update availability");
    } finally {
      setUpdatingAvailability(false);
    }
  };

  const handleAcceptRequest = async (donorRequestId: string) => {
    try {
      setActionLoadingId(donorRequestId);
      await respondToDonorRequest(donorRequestId, "ACCEPT");
      showToast("Request accepted! Hospital has been notified.");
      // Refresh requests and profile
      await loadDashboardData();
    } catch (err) {
      console.error("Failed to accept request:", err);
      showToast(err instanceof Error ? err.message : "Failed to accept request");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeclineRequest = async (donorRequestId: string) => {
    try {
      setActionLoadingId(donorRequestId);
      await respondToDonorRequest(donorRequestId, "DECLINE");
      showToast("Request declined.");
      await loadDashboardData();
    } catch (err) {
      console.error("Failed to decline request:", err);
      showToast(err instanceof Error ? err.message : "Failed to decline request");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login/donor");
  };

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <div className="min-h-screen bb-network-bg text-bb-text">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-2xl animate-in fade-in slide-in-from-bottom-3">
          {toast}
        </div>
      )}

      {/* Navigation */}
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
            <span className="ml-2 rounded-md bg-bb-crimson/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-bb-crimson">
              Donor Portal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <AvailabilitySelector
            availability={availability}
            onUpdate={handleAvailabilityUpdate}
            loading={updatingAvailability}
          />
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl border border-bb-border px-3.5 py-2 text-xs font-semibold text-bb-muted hover:bg-white hover:text-bb-text transition"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header greeting */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-bb-text">
              Welcome, {user?.name || "Donor"}
            </h1>
            <p className="mt-1 text-xs text-bb-muted">
              Live matching network — saving lives through verified proximity and compatibility
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-bb-teal/10 border border-bb-teal/30 px-3 py-1 text-xs font-mono font-bold text-bb-teal uppercase tracking-wider">
              <span className="size-1.5 rounded-full bg-bb-teal animate-blink" />
              Live Connected
            </span>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={loadDashboardData}
              className="font-bold underline hover:text-red-900"
            >
              Retry
            </button>
          </div>
        )}

        {/* Real Metrics Stats Grid */}
        <DonorStats
          bloodGroup={user?.bloodGroup as string || (user?.blood_group as string)}
          availability={availability}
          statistics={statistics}
        />

        {/* Navigation Tabs */}
        <div className="flex border-b border-bb-border gap-2">
          <button
            type="button"
            onClick={() => setTab("overview")}
            className={`flex items-center gap-2 pb-3 pt-2 text-xs font-bold transition border-b-2 ${tab === "overview"
              ? "border-bb-crimson text-bb-crimson"
              : "border-transparent text-bb-muted hover:text-bb-text"
              }`}
          >
            <span>Active Requests</span>
            {pendingCount > 0 && (
              <span className="rounded-full bg-bb-crimson px-2 py-0.5 text-[10px] text-white">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab("history")}
            className={`flex items-center gap-2 pb-3 pt-2 text-xs font-bold transition border-b-2 ${tab === "history"
              ? "border-bb-crimson text-bb-crimson"
              : "border-transparent text-bb-muted hover:text-bb-text"
              }`}
          >
            <span>Donation History</span>
            {donations.length > 0 && (
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-bb-text">
                {donations.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab("requirements")}
            className={`flex items-center gap-2 pb-3 pt-2 text-xs font-bold transition border-b-2 ${tab === "requirements"
              ? "border-bb-crimson text-bb-crimson"
              : "border-transparent text-bb-muted hover:text-bb-text"
              }`}
          >
            <span>Eligibility Guidelines</span>
          </button>
        </div>

        {/* Tab Content */}
        {tab === "overview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-bb-text">Nearby Blood Requests</h2>
                <p className="text-xs text-bb-muted">
                  Requests matched to your blood group and registered proximity
                </p>
              </div>
              <button
                type="button"
                onClick={loadDashboardData}
                disabled={loading}
                className="text-xs font-semibold text-bb-muted hover:text-bb-text underline"
              >
                Refresh
              </button>
            </div>

            <DonorRequestsList
              requests={requests}
              onAccept={handleAcceptRequest}
              onDecline={handleDeclineRequest}
              actionLoadingId={actionLoadingId}
            />
          </div>
        )}

        {tab === "history" && (
          <DonationHistory donations={donations} loading={loading} />
        )}

        {tab === "requirements" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-bb-text">Medical Eligibility Criteria</h2>
              <p className="text-xs text-bb-muted">
                Ensure you meet standard safety protocols before your donation appointment
              </p>
            </div>
            <DonorEligibilityGuide />
          </div>
        )}
      </main>
    </div>
  );
}
