import type { DonationRecord } from "../../types";
import BloodGroupBadge from "../BloodGroupBadge";

interface DonationHistoryProps {
  donations: DonationRecord[];
  loading?: boolean;
}

export default function DonationHistory({
  donations,
  loading = false,
}: DonationHistoryProps) {
  if (loading) {
    return (
      <div className="glass rounded-2xl p-8 border border-bb-border text-center">
        <div className="inline-flex items-center gap-2 text-sm text-bb-muted">
          <svg className="size-5 animate-spin text-bb-crimson" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading verified donation history...
        </div>
      </div>
    );
  }

  if (donations.length === 0) {
    return (
      <div className="glass rounded-2xl p-10 border border-bb-border text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-bb-crimson/10 text-bb-crimson mb-4">
          <svg className="size-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-bb-text">No Donations Recorded Yet</h3>
        <p className="mt-1 text-xs text-bb-muted max-w-sm mx-auto">
          When a hospital confirms your blood donation, the verified record will appear here in your official history.
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl border border-bb-border overflow-hidden">
      <div className="px-5 py-4 border-b border-bb-border flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-bb-text">Official Donation Records</h2>
          <p className="text-xs text-bb-muted">
            {donations.length} verified {donations.length === 1 ? "donation" : "donations"} recorded in database
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-bb-muted border-b border-bb-border">
            <tr>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Hospital / Facility</th>
              <th className="px-5 py-3">Blood Group</th>
              <th className="px-5 py-3">Units</th>
              <th className="px-5 py-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bb-border">
            {donations.map((donation) => {
              const formattedDate = new Date(donation.donated_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              });

              return (
                <tr key={donation.id} className="hover:bg-white/60 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-bb-text whitespace-nowrap">
                    {formattedDate}
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-bb-text">
                    {donation.hospital_name || "Hospital Facility"}
                  </td>
                  <td className="px-5 py-3.5">
                    <BloodGroupBadge group={donation.blood_group} size="sm" />
                  </td>
                  <td className="px-5 py-3.5 font-medium text-bb-text">
                    {donation.units} {donation.units === 1 ? "unit" : "units"}
                  </td>
                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                      <span className="size-1.5 rounded-full bg-emerald-600" />
                      {donation.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
