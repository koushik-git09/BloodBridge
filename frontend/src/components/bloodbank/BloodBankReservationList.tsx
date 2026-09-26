import { useState } from "react";
import type { BloodBankReservationResponse, ReservationAction } from "../../services/bloodBankService";
import type { BloodGroup, Urgency } from "../../types";
import BloodGroupBadge from "../BloodGroupBadge";
import UrgencyBadge from "../UrgencyBadge";

interface BloodBankReservationListProps {
  reservations: BloodBankReservationResponse[];
  inventory: Record<BloodGroup, number>;
  onRespond: (
    reservationId: string,
    action: ReservationAction,
    unitsConfirmed: number
  ) => Promise<void>;
  responding: boolean;
}

export default function BloodBankReservationList({
  reservations,
  inventory,
  onRespond,
  responding,
}: BloodBankReservationListProps) {
  const [selectedRes, setSelectedRes] = useState<BloodBankReservationResponse | null>(null);
  const [action, setAction] = useState<ReservationAction | null>(null);
  const [units, setUnits] = useState(0);

  const selectedStock = selectedRes ? (inventory[selectedRes.blood_group] ?? 0) : 0;

  const handleOpenAction = (
    res: BloodBankReservationResponse,
    act: ReservationAction
  ) => {
    const stock = inventory[res.blood_group] ?? 0;
    if (act !== "REJECT" && stock <= 0) return;
    setSelectedRes(res);
    setAction(act);
    if (act === "CONFIRM") {
      setUnits(res.units_requested);
    } else if (act === "PARTIAL") {
      const maxAllowed = Math.max(1, Math.min(stock, res.units_requested - 1));
      setUnits(maxAllowed);
    }
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
              {selectedRes.patient_reference && (
                <p>
                  <strong>Patient Reference:</strong>{" "}
                  <span className="font-mono text-bb-dim font-bold">{selectedRes.patient_reference}</span>
                </p>
              )}
              {selectedRes.hospital_phone && (
                <p className="flex items-center gap-2">
                  <strong>Hospital Contact:</strong>{" "}
                  <a
                    href={`tel:${selectedRes.hospital_phone}`}
                    className="font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
                  >
                    📞 {selectedRes.hospital_phone}
                  </a>
                </p>
              )}
              {selectedRes.hospital_address && (
                <p className="flex items-start gap-1 text-slate-700">
                  <strong className="text-bb-crimson shrink-0">📍 Location:</strong>
                  <span>{selectedRes.hospital_address}</span>
                </p>
              )}

              <p>
                <strong>Blood Group:</strong> {selectedRes.blood_group}
              </p>
              <p>
                <strong>Units Requested:</strong> {selectedRes.units_requested}
              </p>
              <p>
                <strong>Current Stock in Bank:</strong>{" "}
                <span
                  className={`font-bold ${
                    selectedStock > 0 ? "text-emerald-700" : "text-red-600"
                  }`}
                >
                  {selectedStock} {selectedStock === 1 ? "unit" : "units"} in inventory
                </span>
              </p>
            </div>

            {action === "CONFIRM" && selectedStock < selectedRes.units_requested && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 space-y-1">
                <p className="font-bold">⚠️ Insufficient Stock to Confirm All Units</p>
                <p>
                  You have {selectedStock} units of {selectedRes.blood_group} in stock, but {selectedRes.units_requested} units were requested. You cannot confirm more than what is available.
                </p>
              </div>
            )}

            {action === "PARTIAL" && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-bb-text">
                  Units you can confirm (1 to {Math.min(selectedStock, selectedRes.units_requested - 1)}):
                </label>
                <input
                  type="number"
                  min={1}
                  max={Math.min(selectedStock, selectedRes.units_requested - 1)}
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
                disabled={
                  responding ||
                  (action === "CONFIRM" && selectedStock < selectedRes.units_requested) ||
                  (action === "PARTIAL" && (units <= 0 || units > selectedStock || selectedStock <= 0))
                }
                onClick={handleExecute}
                className={`rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed ${
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
            const isFulfilledByOther = res.status === "FULFILLED_BY_OTHER";

            const stock = inventory[res.blood_group] ?? 0;
            const hasStock = stock > 0;
            const hasFullStock = stock >= res.units_requested;

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
                      {res.hospital_address && (
                        <p className="mt-0.5 text-xs text-slate-700 flex items-start gap-1 font-medium">
                          <span className="text-bb-crimson shrink-0">📍</span>
                          <span>{res.hospital_address}</span>
                        </p>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-bb-muted">
                        {res.patient_reference && (
                          <>
                            <span>Ref: <strong className="font-mono text-bb-dim">{res.patient_reference}</strong></span>
                            <span>•</span>
                          </>
                        )}
                        <span>Distance: <strong className="text-bb-text">{res.distance.toFixed(1)} km</strong></span>

                        <span>•</span>
                        <span>Requested: <strong className="text-bb-text">{res.units_requested} units</strong></span>
                        <span>•</span>
                        <span>
                          In Stock:{" "}
                          <strong className={hasStock ? "text-emerald-700" : "text-red-600 font-bold"}>
                            {stock} {stock === 1 ? "unit" : "units"}
                          </strong>
                        </span>
                        {res.units_confirmed > 0 && (
                          <>
                            <span>•</span>
                            <span>Confirmed: <strong className="text-emerald-700">{res.units_confirmed} units</strong></span>
                          </>
                        )}
                      </div>

                      {res.hospital_phone && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs">
                          <span className="text-slate-700 font-medium">
                            Hospital Contact: <span className="text-bb-text font-bold">{res.hospital_phone}</span>
                          </span>
                          <a
                            href={`tel:${res.hospital_phone}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 text-xs font-semibold transition active:scale-95"
                          >
                            📞 Contact Hospital
                          </a>
                        </div>
                      )}
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
                              : isFulfilledByOther
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : "bg-red-50 text-red-700 border-red-200"
                      }`}
                    >
                      {isFulfilledByOther ? "FULFILLED BY OTHER" : res.status}
                    </span>
                  </div>
                </div>

                {isFulfilledByOther && (
                  <div className="mt-3 rounded-xl border border-purple-200 bg-purple-50/70 px-3.5 py-2 text-xs text-purple-800 flex items-center gap-1.5">
                    <span>ℹ️ This request was fulfilled by another blood bank facility.</span>
                  </div>
                )}

                {isPending && (
                  <>
                    {!hasStock && (
                      <div className="mt-3 rounded-xl border border-red-200 bg-red-50/80 px-3.5 py-2.5 text-xs text-red-700 flex items-center justify-between">
                        <span>
                          ⚠️ <strong>Out of Stock:</strong> You have 0 units of {res.blood_group} in inventory. You cannot confirm units without stock. Please reject this request to route immediately to donors.
                        </span>
                      </div>
                    )}
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
                        disabled={responding || !hasStock}
                        onClick={() => handleOpenAction(res, "PARTIAL")}
                        title={!hasStock ? "No stock available in inventory" : undefined}
                        className="rounded-xl border border-blue-300 bg-blue-50/60 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Partial Units
                      </button>
                      <button
                        type="button"
                        disabled={responding || !hasFullStock}
                        onClick={() => handleOpenAction(res, "CONFIRM")}
                        title={!hasFullStock ? (stock === 0 ? "No stock in inventory" : `Only ${stock} units in inventory`) : undefined}
                        className="rounded-xl bg-bb-crimson px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-bb-crimson-bright transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Confirm All ({res.units_requested} units)
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
