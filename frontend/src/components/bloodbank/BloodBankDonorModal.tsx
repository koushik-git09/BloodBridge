import { useEffect, useState, useCallback } from "react";
import type { BloodBankReservationResponse } from "../../services/bloodBankService";
import {
  getBloodRequest,
  confirmDonorDonation,
  type BloodRequestResponse,
} from "../../services/requestService";
import type { Donor, BloodGroup, Urgency } from "../../types";
import BloodGroupBadge from "../BloodGroupBadge";
import UrgencyBadge from "../UrgencyBadge";
import DonorMatchCard from "../DonorMatchCard";
import { formatDate, formatDateTime } from "../../utils/date";
import { emitBloodBridgeEvent } from "../../utils/events";

interface BloodBankDonorModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: BloodBankReservationResponse | null;
  onDonationConfirmed: () => void;
}

export default function BloodBankDonorModal({
  isOpen,
  onClose,
  reservation,
  onDonationConfirmed,
}: BloodBankDonorModalProps) {
  const [request, setRequest] = useState<BloodRequestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedDonorForConfirm, setSelectedDonorForConfirm] = useState<Donor | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3500);
  };

  const loadRequest = useCallback(async (requestId: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await getBloodRequest(requestId);
      setRequest(res);
    } catch (err) {
      console.error("Failed to load blood request for blood bank:", err);
      setError(err instanceof Error ? err.message : "Failed to load request details");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && reservation?.request_id) {
      loadRequest(reservation.request_id);
    } else {
      setRequest(null);
      setError(null);
    }
  }, [isOpen, reservation?.request_id, loadRequest]);

  if (!isOpen || !reservation) return null;

  const rawDonors = request?.donors || request?.donor_matches || [];
  const donors: Donor[] = rawDonors.map((d) => {
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

  const handleExecuteConfirm = async () => {
    if (!selectedDonorForConfirm || !selectedDonorForConfirm.donorRequestId || !request) return;
    const donorReqId = selectedDonorForConfirm.donorRequestId;
    const donorName = selectedDonorForConfirm.name;

    try {
      setConfirming(true);
      await confirmDonorDonation(request.id, donorReqId);
      setSelectedDonorForConfirm(null);
      showToast(`Donation for ${donorName} confirmed successfully!`);

      // Refresh local request
      await loadRequest(request.id);
      // Notify parent to refresh reservations and dashboard
      onDonationConfirmed();

      // Emit global event for immediate sync across portals
      emitBloodBridgeEvent("bloodbridge:request-updated", {
        target: "all",
        requestId: request.id,
        source: "blood_bank_confirm_donation",
      });
    } catch (err) {
      console.error("Failed to confirm donation:", err);
      showToast(err instanceof Error ? err.message : "Failed to confirm donation");
    } finally {
      setConfirming(false);
    }
  };

  const isFulfilled =
    request?.status === "FULFILLED" ||
    request?.status === "CONFIRMED" ||
    (request && request.remaining_units <= 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-60 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-2xl animate-in fade-in slide-in-from-top-3">
          {toast}
        </div>
      )}

      {/* Confirmation Modal */}
      {selectedDonorForConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md glass rounded-2xl p-6 border border-bb-border space-y-4 shadow-2xl bg-white/95">
            <div className="flex items-center gap-3 text-bb-crimson">
              <span className="flex size-10 items-center justify-center rounded-xl bg-bb-crimson/10 text-xl">
                💉
              </span>
              <div>
                <h3 className="text-base font-bold text-bb-text">Confirm Blood Donation</h3>
                <p className="text-xs text-bb-muted">Blood Bank Verification Protocol</p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-3.5 text-xs text-bb-text space-y-1.5 border border-bb-border/60">
              <p>
                <strong>Donor:</strong> {selectedDonorForConfirm.name}
              </p>
              <p>
                <strong>Blood Group:</strong> {selectedDonorForConfirm.bloodGroup}
              </p>
              <p>
                <strong>Request Ref:</strong>{" "}
                <span className="font-mono text-bb-dim font-bold">
                  {request?.patient_reference || request?.id}
                </span>
              </p>
              <p>
                <strong>Hospital:</strong> {request?.hospital_name || reservation.hospital_name || "Hospital Facility"}
              </p>
            </div>

            <p className="text-xs text-bb-muted leading-relaxed">
              Confirming this donation will officially log <strong>1 unit</strong> of donated blood into the donations database, update the donor&apos;s history and eligibility cooldown, and mark this donor request as <strong>DONATED</strong>.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={confirming}
                onClick={() => setSelectedDonorForConfirm(null)}
                className="rounded-xl border border-bb-border px-4 py-2 text-xs font-semibold text-bb-muted hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirming}
                onClick={handleExecuteConfirm}
                className="rounded-xl bg-bb-crimson px-4 py-2 text-xs font-bold text-white hover:bg-bb-crimson-bright shadow-sm transition disabled:opacity-50"
              >
                {confirming ? "Confirming..." : "Confirm Actual Donation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Modal Card */}
      <div className="w-full max-w-4xl glass rounded-3xl border border-bb-border shadow-2xl bg-white/95 my-auto max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-bb-border bg-slate-50/80 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <BloodGroupBadge group={reservation.blood_group} size="lg" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-black text-bb-text">
                  {reservation.patient_reference || `Blood Request #${reservation.request_id.slice(-6)}`}
                </h2>
                {reservation.urgency && (
                  <UrgencyBadge urgency={reservation.urgency as Urgency} />
                )}
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                    isFulfilled
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-blue-50 text-blue-700 border-blue-200"
                  }`}
                >
                  {request?.status || reservation.status}
                </span>
              </div>
              <p className="text-xs text-bb-muted mt-1 flex flex-wrap items-center gap-2">
                <span>Hospital: <strong className="text-bb-text">{reservation.hospital_name || "Hospital Facility"}</strong></span>
                <span>•</span>
                <span>Created: {formatDateTime(reservation.created_at)}</span>
              </p>
              {reservation.hospital_address && (
                <p className="text-xs text-slate-700 font-medium flex items-center gap-1 mt-0.5">
                  <span className="text-bb-crimson">📍</span>
                  <span>{reservation.hospital_address}</span>
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-full border border-bb-border bg-white text-bb-muted hover:text-bb-text flex items-center justify-center transition shrink-0 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Units Fulfillment Metrics */}
          {request && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-bb-border/70 text-xs">
              <div>
                <p className="text-[10px] uppercase font-bold text-bb-muted">Total Units Needed</p>
                <p className="text-base font-black text-bb-text mt-0.5">{request.units_required}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-bb-teal">From Blood Banks</p>
                <p className="text-base font-black text-bb-teal mt-0.5">{request.blood_bank_units || 0}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-bb-crimson">From Donors</p>
                <p className="text-base font-black text-bb-crimson mt-0.5">{request.donor_units || 0}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-amber-600">Remaining Units</p>
                <p className="text-base font-black text-amber-600 mt-0.5">{request.remaining_units}</p>
              </div>
            </div>
          )}

          {/* Fulfillment Notice if Completed */}
          {isFulfilled && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs text-emerald-800 flex items-center gap-2">
              <span className="text-base">✅</span>
              <span>
                <strong>Request Complete:</strong> All required units for this request have been successfully secured and fulfilled.
              </span>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="py-12 text-center text-xs text-bb-muted space-y-2">
              <div className="inline-block size-6 animate-spin rounded-full border-2 border-bb-crimson border-t-transparent" />
              <p>Scanning and loading eligible donors in proximity...</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700 flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => reservation.request_id && loadRequest(reservation.request_id)}
                className="font-bold underline hover:text-red-900"
              >
                Retry
              </button>
            </div>
          )}

          {/* Donors List Section */}
          {!loading && !error && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-bb-text">
                    Eligible Donors for this Request
                  </h3>
                  <p className="text-xs text-bb-muted">
                    Compatibility, proximity, availability, and trust score ranking
                  </p>
                </div>
                <span className="font-mono text-xs text-bb-dim font-bold">
                  {donors.length} {donors.length === 1 ? "donor" : "donors"} found
                </span>
              </div>

              {donors.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-bb-border p-8 sm:p-10 text-center space-y-2 bg-slate-50/60">
                  <p className="text-sm font-semibold text-bb-text">
                    {isFulfilled
                      ? "Request Fully Fulfilled"
                      : request?.status === "CHECKING_BLOOD_BANK"
                        ? "Awaiting Blood Bank Confirmation"
                        : "No Donors Matched Yet"}
                  </p>
                  <p className="text-xs text-bb-muted max-w-md mx-auto leading-relaxed">
                    {isFulfilled
                      ? "All required blood units for this request were fulfilled."
                      : request?.status === "CHECKING_BLOOD_BANK"
                        ? "This request is currently awaiting blood bank fulfillment. Once the reservation is confirmed or responded to, any remaining unfulfilled units will automatically trigger donor matching and be visible here."
                        : "The rule-based matching engine is continuously monitoring registered donors in proximity. When donors accept or become eligible, they will appear here for confirmation."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {donors.map((donor) => (
                    <DonorMatchCard
                      key={donor.id}
                      donor={donor}
                      viewMode="blood_bank"
                      onConfirmDonation={() => setSelectedDonorForConfirm(donor)}
                      isConfirmingDonation={confirming && selectedDonorForConfirm?.donorRequestId === donor.donorRequestId}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-bb-border bg-slate-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-bb-border bg-white px-4 py-2 text-xs font-semibold text-bb-muted hover:bg-slate-100 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
