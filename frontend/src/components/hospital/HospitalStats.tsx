import type { BloodRequest } from "../../types";

interface HospitalStatsProps {
  requests: BloodRequest[];
}

export default function HospitalStats({ requests }: HospitalStatsProps) {
  const total = requests.length;
  const active = requests.filter(
    (r) => r.status === "CHECKING_BLOOD_BANK" || r.status === "DONOR_MATCHING"
  ).length;
  const fulfilled = requests.filter((r) => r.status === "FULFILLED").length;
  const totalUnitsReceived = requests.reduce(
    (sum, r) => sum + (r.bloodBankUnits || 0) + (r.donorUnits || 0),
    0
  );

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div className="glass rounded-2xl p-4 sm:p-5 border border-bb-border">
        <p className="text-xs font-semibold uppercase tracking-wider text-bb-muted">
          Total Requests
        </p>
        <p className="mt-1 text-2xl font-black text-bb-text sm:text-3xl">
          {total}
        </p>
      </div>

      <div className="glass rounded-2xl p-4 sm:p-5 border border-bb-border">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">
          Active Matching
        </p>
        <p className="mt-1 text-2xl font-black text-amber-600 sm:text-3xl">
          {active}
        </p>
      </div>

      <div className="glass rounded-2xl p-4 sm:p-5 border border-bb-border">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
          Fulfilled
        </p>
        <p className="mt-1 text-2xl font-black text-emerald-600 sm:text-3xl">
          {fulfilled}
        </p>
      </div>

      <div className="glass rounded-2xl p-4 sm:p-5 border border-bb-border">
        <p className="text-xs font-semibold uppercase tracking-wider text-bb-crimson">
          Units Secured
        </p>
        <p className="mt-1 text-2xl font-black text-bb-crimson sm:text-3xl">
          {totalUnitsReceived}
        </p>
      </div>
    </div>
  );
}
