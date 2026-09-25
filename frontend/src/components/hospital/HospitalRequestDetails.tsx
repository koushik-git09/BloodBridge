import { useState } from "react";
import type { BloodRequest } from "../../types";
import BloodGroupBadge from "../BloodGroupBadge";
import UrgencyBadge from "../UrgencyBadge";
import RequestTimeline from "../RequestTimeline";
import BloodFlowNetwork from "../BloodFlowNetwork";
import HospitalDonorMatchingTab from "./HospitalDonorMatchingTab";
import { formatDateTime } from "../../utils/date";

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
  const [activeTab, setActiveTab] = useState<"timeline" | "donors" | "blood_banks" | "network">("timeline");

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
                Created: {formatDateTime(request.createdAt)} • {request.hospital}
              </p>
              {request.hospitalAddress && (
                <p className="text-xs text-slate-700 font-medium flex items-center gap-1 mt-0.5">
                  <span className="text-bb-crimson">📍</span>
                  <span>{request.hospitalAddress}</span>
                </p>
              )}
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
        <div className="flex border-b border-bb-border gap-4 pt-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("timeline")}
            className={`pb-2 text-xs font-bold transition whitespace-nowrap border-b-2 ${
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
            className={`pb-2 text-xs font-bold transition whitespace-nowrap border-b-2 flex items-center gap-1.5 ${
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
            onClick={() => setActiveTab("blood_banks")}
            className={`pb-2 text-xs font-bold transition whitespace-nowrap border-b-2 flex items-center gap-1.5 ${
              activeTab === "blood_banks"
                ? "border-bb-crimson text-bb-crimson"
                : "border-transparent text-bb-muted hover:text-bb-text"
            }`}
          >
            <span>Nearby Blood Banks</span>
            {request.bloodBanks && request.bloodBanks.length > 0 && (
              <span className="size-4 rounded-full bg-bb-teal text-[10px] text-white flex items-center justify-center">
                {request.bloodBanks.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("network")}
            className={`pb-2 text-xs font-bold transition whitespace-nowrap border-b-2 ${
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

        {activeTab === "blood_banks" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-bb-muted">
                Nearby Blood Banks Contacted
              </h3>
              <span className="text-xs text-bb-muted font-medium">
                {request.bloodBanks?.length || 0} Facilities Contacted
              </span>
            </div>

            {(!request.bloodBanks || request.bloodBanks.length === 0) ? (
              <div className="rounded-xl border border-dashed border-bb-border p-8 text-center text-xs text-bb-muted">
                No nearby blood bank reservations for this request.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {request.bloodBanks.map((bank) => (
                  <div
                    key={bank.id}
                    className="glass rounded-xl p-4 border border-bb-border space-y-2 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-bb-text">{bank.bloodBankName}</h4>
                        {bank.bloodBankAddress && (
                          <p className="mt-0.5 text-xs text-slate-700 font-medium flex items-start gap-1">
                            <span className="text-bb-crimson shrink-0">📍</span>
                            <span>{bank.bloodBankAddress}</span>
                          </p>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-bb-muted font-mono">
                          <span>Proximity: <strong className="text-bb-text font-sans">{bank.distance.toFixed(1)} km</strong></span>
                          <span>•</span>
                          <span>Requested: <strong className="text-bb-text font-sans">{bank.unitsRequested} units</strong></span>
                          {bank.unitsConfirmed > 0 && (
                            <>
                              <span>•</span>
                              <span>Confirmed: <strong className="text-emerald-700 font-sans">{bank.unitsConfirmed} units</strong></span>
                            </>
                          )}
                        </div>

                        {bank.bloodBankPhone && (
                          <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs">
                            <span className="text-slate-700 font-medium">
                              Mobile: <span className="text-bb-text font-bold">{bank.bloodBankPhone}</span>
                            </span>
                            <a
                              href={`tel:${bank.bloodBankPhone}`}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 text-xs font-semibold transition active:scale-95"
                            >
                              📞 Contact Blood Bank
                            </a>
                          </div>
                        )}
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                          bank.status === "CONFIRMED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : bank.status === "PARTIAL"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : bank.status === "PENDING"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : bank.status === "FULFILLED_BY_OTHER"
                                  ? "bg-purple-50 text-purple-700 border-purple-200"
                                  : "bg-red-50 text-red-700 border-red-200"
                        }`}
                      >
                        {bank.status === "FULFILLED_BY_OTHER" ? "FULFILLED BY OTHER" : bank.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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

