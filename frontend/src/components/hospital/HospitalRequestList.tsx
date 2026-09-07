import { useState } from "react";
import type { BloodRequest } from "../../types";
import BloodGroupBadge from "../BloodGroupBadge";
import UrgencyBadge from "../UrgencyBadge";

interface HospitalRequestListProps {
  requests: BloodRequest[];
  selectedId: string | null;
  onSelect: (request: BloodRequest) => void;
  onCreateClick: () => void;
}

export default function HospitalRequestList({
  requests,
  selectedId,
  onSelect,
  onCreateClick,
}: HospitalRequestListProps) {
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "FULFILLED">("ALL");

  const filtered = requests.filter((r) => {
    if (filter === "ACTIVE") {
      return (
        r.status === "CHECKING_BLOOD_BANK" ||
        r.status === "DONOR_MATCHING" ||
        r.status === "PARTIAL_FULFILLMENT"
      );
    }
    if (filter === "FULFILLED") {
      return r.status === "FULFILLED" || r.status === "CONFIRMED";
    }
    return true;
  });

  return (
    <div className="glass rounded-2xl border border-bb-border overflow-hidden flex flex-col h-[680px]">
      {/* List Header */}
      <div className="p-4 border-b border-bb-border space-y-3 bg-white/40">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-bb-text">Blood Requests</h2>
          <button
            type="button"
            onClick={onCreateClick}
            className="rounded-xl bg-bb-crimson px-3 py-1.5 text-xs font-bold text-white hover:bg-bb-crimson-bright transition shadow-sm"
          >
            + New Request
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1.5 p-1 bg-slate-100/70 rounded-xl">
          {(["ALL", "ACTIVE", "FULFILLED"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`flex-1 rounded-lg py-1 text-[11px] font-bold transition ${
                filter === f
                  ? "bg-white text-bb-text shadow-sm"
                  : "text-bb-muted hover:text-bb-text"
              }`}
            >
              {f === "ALL" ? `All (${requests.length})` : f}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Scrollable List */}
      <div className="flex-1 overflow-y-auto divide-y divide-bb-border">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-bb-muted">
            No blood requests found.
          </div>
        ) : (
          filtered.map((req) => {
            const isSelected = req.id === selectedId;
            const progress = Math.min(
              100,
              Math.round(
                (((req.bloodBankUnits || 0) + (req.donorUnits || 0)) /
                  req.unitsRequired) *
                  100
              )
            );

            return (
              <button
                key={req.id}
                type="button"
                onClick={() => onSelect(req)}
                className={`w-full p-4 text-left transition flex flex-col gap-2 ${
                  isSelected
                    ? "bg-bb-crimson/5 border-l-4 border-l-bb-crimson"
                    : "hover:bg-white/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BloodGroupBadge group={req.bloodGroup} size="sm" />
                    <span className="font-bold text-xs text-bb-text truncate max-w-[120px]">
                      {req.patient_reference || `Req #${req.id.slice(-5)}`}
                    </span>
                  </div>
                  <UrgencyBadge urgency={req.urgency} />
                </div>

                <div className="flex items-center justify-between text-[11px] text-bb-muted">
                  <span>
                    Secured:{" "}
                    <strong className="text-bb-text">
                      {(req.bloodBankUnits || 0) + (req.donorUnits || 0)}
                    </strong>{" "}
                    / {req.unitsRequired} units
                  </span>
                  <span className="font-mono">{progress}%</span>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      progress >= 100 ? "bg-emerald-500" : "bg-bb-crimson"
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
