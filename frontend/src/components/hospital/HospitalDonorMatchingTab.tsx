import { useState } from "react";
import type { BloodRequest, Donor } from "../../types";
import DonorMatchCard from "../DonorMatchCard";

interface HospitalDonorMatchingTabProps {
  request: BloodRequest;
  onConfirmDonation: (requestId: string, donorRequestId: string) => Promise<void>;
  confirmingDonorRequestId: string | null;
}

export default function HospitalDonorMatchingTab({
  request,
  onConfirmDonation,
  confirmingDonorRequestId,
}: HospitalDonorMatchingTabProps) {
  const [selectedDonorForConfirm, setSelectedDonorForConfirm] = useState<Donor | null>(null);

  const donors = request.donors || [];

  const handleOpenConfirm = (donor: Donor) => {
    setSelectedDonorForConfirm(donor);
  };

  const handleExecuteConfirm = async () => {
    if (!selectedDonorForConfirm || !selectedDonorForConfirm.donorRequestId) return;
    const donorReqId = selectedDonorForConfirm.donorRequestId;
    setSelectedDonorForConfirm(null);
    await onConfirmDonation(request.id, donorReqId);
  };

  return (
    <div className="space-y-4">
      {/* Confirmation Modal */}
      {selectedDonorForConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md glass rounded-2xl p-6 border border-bb-border space-y-4 shadow-2xl bg-white/95">
            <div className="flex items-center gap-3 text-bb-crimson">
              <span className="flex size-10 items-center justify-center rounded-xl bg-bb-crimson/10 text-xl">
                💉
              </span>
              <div>
                <h3 className="text-base font-bold text-bb-text">Confirm Blood Donation</h3>
                <p className="text-xs text-bb-muted">Hospital Verification Protocol</p>
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
                <strong>Request Ref:</strong> {request.patient_reference || request.id}
              </p>
            </div>

            <p className="text-xs text-bb-muted">
              Confirming this donation will officially log 1 unit of donated blood into the donations database, update the donor&apos;s history and eligibility, and mark this donor request as <strong>DONATED</strong>.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedDonorForConfirm(null)}
                className="rounded-xl border border-bb-border px-4 py-2 text-xs font-semibold text-bb-muted hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteConfirm}
                className="rounded-xl bg-bb-crimson px-4 py-2 text-xs font-bold text-white hover:bg-bb-crimson-bright shadow-sm transition"
              >
                Confirm Actual Donation
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-bb-text">Algorithmic Donor Matches</h3>
          <p className="text-xs text-bb-muted">
            Ranked by geographical proximity, blood compatibility, and verified reliability
          </p>
        </div>
        <span className="font-mono text-xs text-bb-dim font-bold">
          {donors.length} {donors.length === 1 ? "donor" : "donors"} matched
        </span>
      </div>

      {donors.length === 0 ? (
        <div className="glass rounded-xl p-8 border border-bb-border text-center space-y-2">
          <p className="text-sm font-semibold text-bb-text">No Donors Matched Yet</p>
          <p className="text-xs text-bb-muted max-w-sm mx-auto">
            The system continuously scans for available compatible donors in proximity to the hospital.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {donors.map((donor) => (
            <DonorMatchCard
              key={donor.id}
              donor={donor}
              viewMode="hospital"
              onConfirmDonation={() => handleOpenConfirm(donor)}
              isConfirmingDonation={confirmingDonorRequestId === donor.donorRequestId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
