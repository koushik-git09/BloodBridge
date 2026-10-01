import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  getHospitalRegistrations,
  approveHospital,
  rejectHospital,
} from "../services/adminService";
import { logout } from "../services/authService";
import type { HospitalRegistration } from "../types";
import { emitBloodBridgeEvent } from "../utils/events";

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  const [registrations, setRegistrations] = useState<HospitalRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [selectedHospital, setSelectedHospital] = useState<HospitalRegistration | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchRegistrations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getHospitalRegistrations(filter);
      setRegistrations(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load hospital registrations."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchRegistrations();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchRegistrations();
      }
    }, 30000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(interval);
    };
  }, [filter]);

  const handleLogout = () => {
    logout();
    navigate("/admin/login", { replace: true });
  };

  const handleApprove = async (hospitalId: string, hospitalName: string) => {
    setActionLoadingId(hospitalId);
    setError(null);
    setActionSuccess(null);
    try {
      await approveHospital(hospitalId);
      setActionSuccess(`Hospital "${hospitalName}" has been APPROVED successfully.`);
      if (selectedHospital && selectedHospital.id === hospitalId) {
        setSelectedHospital(null);
      }
      await fetchRegistrations();

      emitBloodBridgeEvent("bloodbridge:request-updated", {
        target: "all",
        source: "admin_approve_hospital",
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to approve hospital registration."
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (hospitalId: string, hospitalName: string) => {
    setActionLoadingId(hospitalId);
    setError(null);
    setActionSuccess(null);
    try {
      await rejectHospital(hospitalId);
      setActionSuccess(`Hospital "${hospitalName}" registration has been REJECTED.`);
      if (selectedHospital && selectedHospital.id === hospitalId) {
        setSelectedHospital(null);
      }
      await fetchRegistrations();

      emitBloodBridgeEvent("bloodbridge:request-updated", {
        target: "all",
        source: "admin_reject_hospital",
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to reject hospital registration."
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const counts = useMemo(() => {
    return {
      all: registrations.length,
      pending: registrations.filter((r) => r.status === "PENDING").length,
      approved: registrations.filter((r) => r.status === "APPROVED").length,
      rejected: registrations.filter((r) => r.status === "REJECTED").length,
    };
  }, [registrations]);

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "N/A";
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="min-h-screen bb-network-bg flex flex-col">
      {/* Top Admin Navbar */}
      <header className="glass border-b border-bb-border px-4 sm:px-8 h-16 flex items-center justify-between sticky top-0 z-30 bg-white/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <img
            src="/bloodbridge-logo.png"
            alt="BloodBridge logo"
            className="size-8 object-contain"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base text-bb-text">
                Blood<span className="text-bb-crimson-bright">Bridge</span>
              </span>
              <span className="text-[10px] font-mono uppercase bg-bb-crimson text-white px-2 py-0.5 rounded-full font-bold">
                Admin
              </span>
            </div>
            <p className="text-[11px] text-bb-muted font-medium hidden sm:block">
              Hospital Registration Review Portal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-bb-text">System Administrator</p>
            <p className="text-[10px] text-bb-muted font-mono">bloodbridgeadmin@gmail.com</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl border border-bb-border bg-white/70 hover:bg-red-50 hover:text-red-700 hover:border-red-200 px-3.5 py-1.5 text-xs font-semibold text-bb-dim transition-all shadow-sm flex items-center gap-1.5"
          >
            <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8">
        {/* Banner notifications */}
        {actionSuccess && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 flex items-center justify-between font-medium animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="font-bold text-emerald-600">✓</span>
              <span>{actionSuccess}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionSuccess(null)}
              className="text-emerald-700 hover:text-emerald-950 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 flex items-center justify-between font-medium">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-700 hover:text-red-950 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Dashboard Title & Filter Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black text-bb-text tracking-tight flex items-center gap-2">
              Hospital Registration Requests
            </h1>
            <p className="text-xs sm:text-sm text-bb-muted mt-1">
              Review credential submissions from healthcare institutions before granting network access.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="glass rounded-xl border border-bb-border p-1 flex items-center gap-1 bg-white/70 self-start md:self-auto shadow-sm">
            {(
              [
                { key: "PENDING", label: "Pending" },
                { key: "ALL", label: "All" },
                { key: "APPROVED", label: "Approved" },
                { key: "REJECTED", label: "Rejected" },
              ] as const
            ).map((tab) => {
              const active = filter === tab.key;
              return (
                <button
                  type="button"
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    active
                      ? "bg-bb-crimson text-white shadow-sm"
                      : "text-bb-muted hover:text-bb-text hover:bg-slate-100/60"
                  }`}
                >
                  {tab.label}
                  {tab.key === "PENDING" && counts.pending > 0 && filter !== "PENDING" && (
                    <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold">
                      {counts.pending}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="glass rounded-2xl border border-bb-border p-12 text-center text-bb-muted">
            <svg className="size-6 animate-spin mx-auto mb-3 text-bb-crimson" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Loading registrations...
          </div>
        ) : registrations.length === 0 ? (
          <div className="glass rounded-2xl border border-bb-border p-12 text-center bg-white/70">
            <div className="size-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-2xl mx-auto mb-3">
              🏥
            </div>
            <h3 className="text-base font-bold text-bb-text">No Hospital Registrations</h3>
            <p className="text-xs text-bb-muted mt-1 max-w-sm mx-auto">
              There are currently no registrations matching the filter &ldquo;{filter}&rdquo;.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {registrations.map((hosp) => {
              const isPending = hosp.status === "PENDING";
              const isApproved = hosp.status === "APPROVED";
              const isRejected = hosp.status === "REJECTED";
              const isProcessing = actionLoadingId === hosp.id;

              return (
                <div
                  key={hosp.id}
                  className="glass rounded-2xl p-5 sm:p-6 border border-bb-border shadow-sm hover:shadow-md transition-all bg-white/85 flex flex-col md:flex-row md:items-center justify-between gap-5"
                >
                  {/* Left Column: Hospital Info */}
                  <div className="space-y-2.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-lg font-black text-bb-text tracking-tight">
                        {hosp.hospital_name}
                      </h2>

                      {/* Status Badge */}
                      {isPending && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                          PENDING
                        </span>
                      )}
                      {isApproved && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ✓ APPROVED
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                          ✕ REJECTED
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1.5 text-xs text-bb-dim">
                      <div className="flex items-center gap-1.5">
                        <span className="text-bb-muted font-semibold">Applicant:</span>
                        <span className="text-bb-text font-medium">{hosp.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-bb-muted font-semibold">Email:</span>
                        <a href={`mailto:${hosp.email}`} className="text-bb-blue hover:underline font-mono">
                          {hosp.email}
                        </a>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-bb-muted font-semibold">Phone:</span>
                        <a href={`tel:${hosp.phone}`} className="text-bb-text font-mono">
                          {hosp.phone}
                        </a>
                      </div>
                    </div>

                    {/* Detected Location */}
                    <div className="flex items-start gap-1.5 text-xs text-bb-dim">
                      <span className="shrink-0 mt-0.5">📍</span>
                      <span className="font-medium text-bb-text">
                        {hosp.location?.address || "Address unavailable"}
                      </span>
                    </div>

                    <div className="text-[11px] text-bb-muted font-mono">
                      Registered: {formatDate(hosp.created_at)}
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                    <button
                      type="button"
                      onClick={() => setSelectedHospital(hosp)}
                      className="rounded-xl border border-bb-border bg-white px-3.5 py-2 text-xs font-bold text-bb-text hover:bg-slate-50 transition shadow-sm"
                    >
                      View Details
                    </button>

                    {isPending && (
                      <>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleApprove(hosp.id, hosp.hospital_name)}
                          className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-xs font-bold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5 active:scale-98"
                        >
                          {isProcessing ? "Processing..." : "Approve"}
                        </button>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleReject(hosp.id, hosp.hospital_name)}
                          className="rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 px-3.5 py-2 text-xs font-bold transition disabled:opacity-50 active:scale-98"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Hospital Registration Details Modal */}
      {selectedHospital && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl border border-bb-border shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-bb-border flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏥</span>
                <div>
                  <h3 className="font-black text-bb-text text-base">
                    Hospital Registration Details
                  </h3>
                  <p className="text-[11px] text-bb-muted font-mono">
                    ID: {selectedHospital.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHospital(null)}
                className="size-8 rounded-lg hover:bg-slate-200 text-bb-muted hover:text-bb-text flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-4 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <span className="text-bb-muted font-semibold block uppercase tracking-wider text-[10px]">
                    Status
                  </span>
                  <span className="font-bold text-sm text-bb-text">
                    {selectedHospital.status}
                  </span>
                </div>
                <div>
                  <span className="text-bb-muted font-semibold block uppercase tracking-wider text-[10px]">
                    Verified Flag
                  </span>
                  <span className="font-bold text-sm text-bb-text">
                    {selectedHospital.verified ? "YES" : "NO"}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-bb-muted font-semibold block uppercase tracking-wider text-[10px]">
                    Hospital Official Name
                  </label>
                  <p className="text-sm font-bold text-bb-text mt-0.5">
                    {selectedHospital.hospital_name}
                  </p>
                </div>

                <div>
                  <label className="text-bb-muted font-semibold block uppercase tracking-wider text-[10px]">
                    Applicant Full Name
                  </label>
                  <p className="text-sm font-medium text-bb-text mt-0.5">
                    {selectedHospital.name}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-bb-muted font-semibold block uppercase tracking-wider text-[10px]">
                      Email Address
                    </label>
                    <p className="text-xs font-mono font-medium text-bb-blue mt-0.5 break-all">
                      {selectedHospital.email}
                    </p>
                  </div>
                  <div>
                    <label className="text-bb-muted font-semibold block uppercase tracking-wider text-[10px]">
                      Contact Phone
                    </label>
                    <p className="text-xs font-mono font-medium text-bb-text mt-0.5">
                      {selectedHospital.phone}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-bb-muted font-semibold block uppercase tracking-wider text-[10px]">
                    Detected Physical Address
                  </label>
                  <p className="text-xs font-medium text-bb-text mt-0.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                    📍 {selectedHospital.location?.address || "Address unavailable"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 text-[11px] text-bb-muted font-mono">
                  <div>
                    <span>Registered:</span>
                    <p className="text-bb-text">{formatDate(selectedHospital.created_at)}</p>
                  </div>
                  {selectedHospital.approved_at && (
                    <div>
                      <span>Approved:</span>
                      <p className="text-emerald-700 font-semibold">{formatDate(selectedHospital.approved_at)}</p>
                    </div>
                  )}
                  {selectedHospital.rejected_at && (
                    <div>
                      <span>Rejected:</span>
                      <p className="text-red-700 font-semibold">{formatDate(selectedHospital.rejected_at)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-bb-border flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedHospital(null)}
                className="px-4 py-2 rounded-xl border border-bb-border text-xs font-bold text-bb-muted hover:text-bb-text bg-white"
              >
                Close
              </button>

              {selectedHospital.status === "PENDING" && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={actionLoadingId === selectedHospital.id}
                    onClick={() => handleReject(selectedHospital.id, selectedHospital.hospital_name)}
                    className="px-3.5 py-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition"
                  >
                    Reject Registration
                  </button>
                  <button
                    type="button"
                    disabled={actionLoadingId === selectedHospital.id}
                    onClick={() => handleApprove(selectedHospital.id, selectedHospital.hospital_name)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm"
                  >
                    Approve Registration
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
