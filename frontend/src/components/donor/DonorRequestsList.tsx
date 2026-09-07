import type { DonorRequest } from "../../services/donorService";
import type { BloodGroup, Urgency } from "../../types";
import BloodGroupBadge from "../BloodGroupBadge";
import UrgencyBadge from "../UrgencyBadge";

interface DonorRequestsListProps {
  requests: DonorRequest[];
  onAccept: (id: string) => Promise<void>;
  onDecline: (id: string) => Promise<void>;
  actionLoadingId: string | null;
}

export default function DonorRequestsList({
  requests,
  onAccept,
  onDecline,
  actionLoadingId,
}: DonorRequestsListProps) {
  if (requests.length === 0) {
    return (
      <div className="glass rounded-2xl p-10 border border-bb-border text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-bb-muted mb-4">
          <svg className="size-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-bb-text">No Active Requests</h3>
        <p className="mt-1 text-xs text-bb-muted max-w-sm mx-auto">
          You will receive real-time matching requests when a hospital near your registered location needs compatible blood.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => {
        const isPending = request.status === "PENDING";
        const isAccepted = request.status === "ACCEPTED";
        const isDonated = request.status === "DONATED";
        const isDeclined = request.status === "DECLINED";
        const isLoading = actionLoadingId === request.id;

        return (
          <div
            key={request.id}
            className="glass rounded-2xl p-5 sm:p-6 border border-bb-border transition hover:border-bb-border/80 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <BloodGroupBadge group={request.blood_group as BloodGroup} size="lg" />
                <div>
                  <h3 className="text-base font-bold text-bb-text">
                    {request.hospital_name || "Emergency Blood Request"}
                  </h3>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-bb-muted">
                    {request.patient_reference && (
                      <span>Ref: <span className="font-mono text-bb-dim">{request.patient_reference}</span></span>
                    )}
                    <span>•</span>
                    <span>Distance: <span className="font-semibold text-bb-text">{request.distance.toFixed(1)} km</span></span>
                    <span>•</span>
                    <span>Match: <span className="font-semibold text-bb-teal">{request.match_score}%</span></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {request.urgency && (
                  <UrgencyBadge urgency={request.urgency as Urgency} />
                )}
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    isPending
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : isAccepted
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : isDonated
                          ? "bg-purple-50 text-purple-700 border border-purple-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                  }`}
                >
                  {request.status}
                </span>
              </div>
            </div>

            {/* Response CTA */}
            {isPending && (
              <div className="mt-5 flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-bb-border/60">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => onDecline(request.id)}
                  className="rounded-xl border border-bb-border px-4 py-2 text-xs font-semibold text-bb-muted hover:bg-slate-50 transition active:scale-98 disabled:opacity-50"
                >
                  Decline
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => onAccept(request.id)}
                  className="rounded-xl bg-bb-crimson px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-bb-crimson-bright transition active:scale-98 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="size-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Updating...
                    </>
                  ) : (
                    "Accept Request"
                  )}
                </button>
              </div>
            )}

            {isAccepted && (
              <div className="mt-4 rounded-xl bg-emerald-50/80 border border-emerald-200/80 p-3 text-xs text-emerald-800 flex items-center justify-between">
                <span>✓ You accepted this request. Please coordinate with the hospital facility.</span>
                <span className="text-[11px] font-medium text-emerald-600">Pending hospital donation confirmation</span>
              </div>
            )}

            {isDonated && (
              <div className="mt-4 rounded-xl bg-purple-50/80 border border-purple-200/80 p-3 text-xs text-purple-800">
                ★ Donation completed & confirmed by the hospital. Thank you for saving lives!
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
