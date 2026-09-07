import { useState } from "react";
import type { BloodRequest } from "../../types";
import BloodGroupBadge from "../BloodGroupBadge";
import UrgencyBadge from "../UrgencyBadge";
import RequestTimeline from "../RequestTimeline";
import BloodFlowNetwork from "../BloodFlowNetwork";
import HospitalDonorMatchingTab from "./HospitalDonorMatchingTab";

interface HospitalRequestDetailsProps {
  request: BloodRequest | null;
  onConfirmDonation: (requestId: string, donorRequestId: string) => Promise<void>;
  confirmingDonorRequestId: string | null;
}

export default function HospitalRequestDetails({
  request,
  onConfirmDonation,
  confirmingDonorRequestId,
}: HospitalRequestDetailsProps) {
  const [activeTab, setActiveTab] = useState<"timeline" | "donors" | "network">("timeline");

  if (!request) {
    return (
      <div className="glass rounded-2xl border border-bb-border p-12 text-center h-full flex flex-col items-center justify-center">
        <p className="text-base font-bold text-bb-text">No Request Selected</p>
        <p className="mt-1 text-xs text-bb-muted max-w-xs">
          Select a blood request from the left panel to inspect fulfillment progress, donor matching, and live network routing.
        </p>
      </div>
    );
  }

  const isFulfilled = request.status === "FULFILLED" || request.status === "CONFIRMED";

  return (
    <div className="glass rounded-2xl border border-bb-border overflow-hidden flex flex-col h-full">
      {/* Details Header */}
      <div className="p-6 border-b border-bb-border bg-white/40 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <BloodGroupBadge group={request.bloodGroup} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-bb-text">
                  {request.patient_reference || `Blood Request #${request.id.slice(-6)}`}
                </h2>
                <UrgencyBadge urgency={request.urgency} />
              </div>
              <p className="text-xs text-bb-muted mt-0.5">
                Created: {new Date(request.createdAt).toLocaleString()} • {request.hospital}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                isFulfilled
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-blue-50 text-blue-700 border border-blue-200"
              }`}
            >
              {request.status}
            </span>
          </div>
        </div>

        {/* Units Secured Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-white/60 rounded-xl border border-bb-border/60 text-xs">
          <div>
            <p className="text-[10px] uppercase font-bold text-bb-muted">Units Required</p>
            <p className="text-base font-black text-bb-text mt-0.5">{request.unitsRequired}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-bb-teal">From Blood Banks</p>
            <p className="text-base font-black text-bb-teal mt-0.5">{request.bloodBankUnits || 0}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-bb-crimson">From Donors</p>
            <p className="text-base font-black text-bb-crimson mt-0.5">{request.donorUnits || 0}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-amber-600">Remaining Needed</p>
            <p className="text-base font-black text-amber-600 mt-0.5">{request.remainingUnits}</p>
          </div>
        </div>

        {/* Navigation Tabs inside details */}
        <div className="flex border-b border-bb-border gap-4 pt-1">
          <button
            type="button"
            onClick={() => setActiveTab("timeline")}
            className={`pb-2 text-xs font-bold transition border-b-2 ${
              activeTab === "timeline"
                ? "border-bb-crimson text-bb-crimson"
                : "border-transparent text-bb-muted hover:text-bb-text"
            }`}
          >
            Fulfillment Timeline
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("donors")}
            className={`pb-2 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
              activeTab === "donors"
                ? "border-bb-crimson text-bb-crimson"
                : "border-transparent text-bb-muted hover:text-bb-text"
            }`}
          >
            <span>Matched Donors</span>
            {request.donors && request.donors.length > 0 && (
              <span className="size-4 rounded-full bg-bb-crimson text-[10px] text-white flex items-center justify-center">
                {request.donors.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("network")}
            className={`pb-2 text-xs font-bold transition border-b-2 ${
              activeTab === "network"
                ? "border-bb-crimson text-bb-crimson"
                : "border-transparent text-bb-muted hover:text-bb-text"
            }`}
          >
            Live Network Flow
          </button>
        </div>
      </div>

      {/* Tab Panel Content */}
      <div className="p-6 overflow-y-auto flex-1">
        {activeTab === "timeline" && (
          <div className="space-y-6 max-w-lg">
            <h3 className="text-xs font-bold uppercase tracking-wider text-bb-muted">
              Verification & Fulfillment Journey
            </h3>
            <RequestTimeline events={request.timeline} />
          </div>
        )}

        {activeTab === "donors" && (
          <HospitalDonorMatchingTab
            request={request}
            onConfirmDonation={onConfirmDonation}
            confirmingDonorRequestId={confirmingDonorRequestId}
          />
        )}

        {activeTab === "network" && (
          <div className="flex flex-col items-center justify-center py-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-bb-muted mb-4 self-start">
              Real-Time Node Routing
            </h3>
            <BloodFlowNetwork variant="hero" requestStatus={request.status} />
          </div>
        )}
      </div>
    </div>
  );
}
