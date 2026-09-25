import type { DonorStatistics, BloodGroup } from "../../types";
import BloodGroupBadge from "../BloodGroupBadge";
import { parseUtcDate, formatDate } from "../../utils/date";

interface DonorStatsProps {
  bloodGroup?: string | null;
  availability?: string | null;
  statistics?: DonorStatistics | null;
}

export default function DonorStats({
  bloodGroup,
  availability = "AVAILABLE",
  statistics,
}: DonorStatsProps) {
  const totalDonations = statistics?.total_donations ?? 0;
  const totalUnits = statistics?.total_units ?? 0;
  const trustScore = statistics?.trust_score ?? 50;

  const parsedLastDonation = parseUtcDate(statistics?.last_donation);
  const daysSinceLastDonation = parsedLastDonation
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - parsedLastDonation.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : null;

  const isEligible = daysSinceLastDonation === null || daysSinceLastDonation >= 90;
  const daysRemaining = daysSinceLastDonation !== null ? Math.max(0, 90 - daysSinceLastDonation) : 0;

  const formattedLastDonation = parsedLastDonation
    ? formatDate(parsedLastDonation)
    : "No prior donations";

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {/* Total Donations */}
      <div className="glass rounded-2xl p-4 sm:p-5 border border-bb-border">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-bb-muted">
            Total Donations
          </p>
          <span className="size-2 rounded-full bg-bb-crimson" />
        </div>
        <p className="mt-2 text-2xl font-black text-bb-text sm:text-3xl">
          {totalDonations}
        </p>
        <p className="mt-1 text-xs text-bb-muted">
          {totalUnits} {totalUnits === 1 ? "unit" : "units"} contributed
        </p>
      </div>

      {/* Blood Group & Availability */}
      <div className="glass rounded-2xl p-4 sm:p-5 border border-bb-border">
        <p className="text-xs font-semibold uppercase tracking-wider text-bb-muted">
          Blood Group
        </p>
        <div className="mt-2 flex items-center gap-2">
          {bloodGroup ? (
            <BloodGroupBadge group={bloodGroup as BloodGroup} size="lg" />
          ) : (
            <span className="text-sm font-semibold text-bb-muted">Not specified</span>
          )}
        </div>
        <p className="mt-2 text-xs font-medium text-bb-dim flex items-center gap-1.5">
          <span>Status:</span>
          <span
            className={`font-semibold ${
              availability === "AVAILABLE"
                ? "text-emerald-600"
                : availability === "BUSY"
                  ? "text-amber-600"
                  : "text-rose-600"
            }`}
          >
            {availability === "AVAILABLE" ? "🟢 Available" : availability === "BUSY" ? "🟡 Busy" : "🔴 Unavailable"}
          </span>
        </p>
      </div>

      {/* Last Donation */}
      <div className="glass rounded-2xl p-4 sm:p-5 border border-bb-border">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-bb-muted">
            Last Donation
          </p>
          {statistics?.last_donation && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                isEligible
                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
              }`}
            >
              {isEligible ? "Eligible" : `${daysRemaining}d Cooldown`}
            </span>
          )}
        </div>
        <p className="mt-2 text-lg font-bold text-bb-text sm:text-xl truncate">
          {formattedLastDonation}
        </p>
        <div className="mt-1 text-xs">
          {statistics?.last_donation ? (
            isEligible ? (
              <span className="text-emerald-600 font-medium">
                ✓ Cooldown complete ({daysSinceLastDonation}d ago)
              </span>
            ) : (
              <span className="text-amber-600 font-medium">
                ⏳ {daysRemaining} days left until eligible
              </span>
            )
          ) : (
            <span className="text-emerald-600 font-medium">
              ✓ Eligible to donate
            </span>
          )}
        </div>
      </div>

      {/* Trust Score */}
      <div className="glass rounded-2xl p-4 sm:p-5 border border-bb-border">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-bb-muted">
            Trust Score
          </p>
          <span className="font-mono text-xs font-bold text-bb-teal">
            {trustScore.toFixed(0)} / 100
          </span>
        </div>
        <p className="mt-2 text-2xl font-black text-bb-text sm:text-3xl">
          {trustScore.toFixed(0)}%
        </p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-bb-teal to-bb-blue transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, trustScore))}%` }}
          />
        </div>
      </div>
    </div>
  );
}
