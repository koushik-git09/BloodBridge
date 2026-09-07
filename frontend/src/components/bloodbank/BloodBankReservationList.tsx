import { useState } from "react";
import type { BloodBankReservationResponse, ReservationAction } from "../../services/bloodBankService";
import type { Urgency } from "../../types";
import BloodGroupBadge from "../BloodGroupBadge";
import UrgencyBadge from "../UrgencyBadge";

interface BloodBankReservationListProps {
  reservations: BloodBankReservationResponse[];
  onRespond: (
    reservationId: string,
    action: ReservationAction,
    unitsConfirmed: number
  ) => Promise<void>;
  responding: boolean;
}

export default function BloodBankReservationList({
  reservations,
  onRespond,
  responding,
}: BloodBankReservationListProps) {
  const [selectedRes, setSelectedRes] = useState<BloodBankReservationResponse | null>(null);
  const [action, setAction] = useState<ReservationAction | null>(null);
  const [units, setUnits] = useState(0);

  const handleOpenAction = (
    res: BloodBankReservationResponse,
    act: ReservationAction
  ) => {
    setSelectedRes(res);
    setAction(act);
    setUnits(act === "CONFIRM" ? res.units_requested : Math.max(1, res.units_requested - 1));
  };

  const handleExecute = async () => {
    if (!selectedRes || !action) return;
    const resId = selectedRes.id;
    const act = action;
    const u = units;
    setSelectedRes(null);
    setAction(null);
    await onRespond(resId, act, u);
  };

  return (
    <div className="space-y-4">
      {/* Response Dialog Modal */}
      {selectedRes && action && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md glass rounded-2xl p-6 border border-bb-border space-y-4 shadow-2xl bg-white/95">
            <h3 className="text-base font-bold text-bb-text">
              {action === "CONFIRM"
                ? "Confirm Blood Reservation"
                : action === "PARTIAL"
                  ? "Partial Fulfillment"
                  : "Reject Reservation Request"}
            </h3>

            <div className="rounded-xl bg-slate-50 p-3.5 text-xs text-bb-text space-y-1.5 border border-bb-border/60">
              <p>
                <strong>Hospital:</strong> {selectedRes.hospital_name || "Hospital Facility"}
              </p>
              <p>
                <strong>Blood Group:</strong> {selectedRes.blood_group}
              </p>
              <p>
                <strong>Units Requested:</strong> {selectedRes.units_requested}
              </p>
            </div>

            {action === "PARTIAL" && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-bb-text">
                  Units you can confirm (1 to {selectedRes.units_requested - 1}):
                </label>
                <input
                  type="number"
                  min={1}
                  max={selectedRes.units_requested - 1}
                  value={units}
                  onChange={(e) => setUnits(Number(e.target.value))}
                  className="w-full rounded-xl border border-bb-border bg-white px-3 py-2 text-sm text-bb-text outline-none focus:ring-2 focus:ring-bb-crimson"
                />
              </div>
            )}

            {action === "REJECT" && (
              <p className="text-xs text-red-600">
                Are you sure you want to reject this request? The system will automatically route to other blood banks and eligible donors.
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedRes(null);
                  setAction(null);
                }}
                className="rounded-xl border border-bb-border px-4 py-2 text-xs font-semibold text-bb-muted hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={responding}
                onClick={handleExecute}
                className={`rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm transition ${
                  action === "REJECT"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-bb-crimson hover:bg-bb-crimson-bright"
                }`}
              >
                {responding ? "Processing..." : "Submit Response"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-bb-text">Incoming Hospital Reservations</h2>
          <p className="text-xs text-bb-muted">
            Automated requests matched by proximity to hospital facilities
          </p>
        </div>
        <span className="font-mono text-xs text-bb-dim font-bold">
          {reservations.length} total
        </span>
      </div>

      {reservations.length === 0 ? (
        <div className="glass rounded-2xl p-10 border border-bb-border text-center">
          <p className="text-base font-bold text-bb-text">No Reservations</p>
          <p className="mt-1 text-xs text-bb-muted max-w-sm mx-auto">
            When hospitals create blood requests within distance of your bank, reservation requests will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reservations.map((res) => {
            const isPending = res.status === "PENDING";
            const isConfirmed = res.status === "CONFIRMED";
            const isPartial = res.status === "PARTIAL";
            const isRejected = res.status === "REJECTED";

            return (
              <div
                key={res.id}
                className="glass rounded-2xl p-5 border border-bb-border transition hover:border-bb-border/80 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <BloodGroupBadge group={res.blood_group} size="lg" />
                    <div>
                      <h3 className="text-sm font-bold text-bb-text">
                        {res.hospital_name || "Hospital Facility"}
                      </h3>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-bb-muted">
                        <span>Distance: <strong className="text-bb-text">{res.distance.toFixed(1)} km</strong></span>
                        <span>•</span>
                        <span>Requested: <strong className="text-bb-text">{res.units_requested} units</strong></span>
                        {res.units_confirmed > 0 && (
                          <>
                            <span>•</span>
                            <span>Confirmed: <strong className="text-emerald-700">{res.units_confirmed} units</strong></span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {res.urgency && (
                      <UrgencyBadge urgency={res.urgency as Urgency} />
                    )}
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold border ${
                        isPending
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : isConfirmed
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : isPartial
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-red-50 text-red-700 border-red-200"
                      }`}
                    >
                      {res.status}
                    </span>
                  </div>
                </div>

                {isPending && (
                  <div className="mt-4 flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-bb-border/60">
                    <button
                      type="button"
                      disabled={responding}
                      onClick={() => handleOpenAction(res, "REJECT")}
                      className="rounded-xl border border-bb-border px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      disabled={responding}
                      onClick={() => handleOpenAction(res, "PARTIAL")}
                      className="rounded-xl border border-blue-300 bg-blue-50/60 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition"
                    >
                      Partial Units
                    </button>
                    <button
                      type="button"
                      disabled={responding}
                      onClick={() => handleOpenAction(res, "CONFIRM")}
                      className="rounded-xl bg-bb-crimson px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-bb-crimson-bright transition"
                    >
                      Confirm All ({res.units_requested} units)
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
