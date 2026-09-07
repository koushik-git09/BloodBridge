import type { BloodGroup } from "../../types";

interface BloodBankStatsProps {
  inventory: Record<BloodGroup, number>;
  pendingReservationsCount: number;
}

export default function BloodBankStats({
  inventory,
  pendingReservationsCount,
}: BloodBankStatsProps) {
  const totalUnits = Object.values(inventory).reduce((sum, val) => sum + val, 0);
  const outOfStockCount = Object.values(inventory).filter((val) => val === 0).length;
  const criticalStockCount = Object.values(inventory).filter(
    (val) => val > 0 && val <= 2
  ).length;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {/* Total Units */}
      <div className="glass rounded-2xl p-4 sm:p-5 border border-bb-border">
        <p className="text-xs font-semibold uppercase tracking-wider text-bb-muted">
          Total Blood Units
        </p>
        <p className="mt-1 text-2xl font-black text-bb-text sm:text-3xl">
          {totalUnits}
        </p>
        <p className="mt-1 text-xs text-bb-muted">Across 8 blood groups</p>
      </div>

      {/* Pending Reservations */}
      <div className="glass rounded-2xl p-4 sm:p-5 border border-bb-border">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">
          Pending Reservations
        </p>
        <p className="mt-1 text-2xl font-black text-amber-600 sm:text-3xl">
          {pendingReservationsCount}
        </p>
        <p className="mt-1 text-xs text-amber-700/80">Requires your response</p>
      </div>

      {/* Low / Critical Stock */}
      <div className="glass rounded-2xl p-4 sm:p-5 border border-bb-border">
        <p className="text-xs font-semibold uppercase tracking-wider text-fuchsia-600">
          Critical Groups (≤2 units)
        </p>
        <p className="mt-1 text-2xl font-black text-fuchsia-600 sm:text-3xl">
          {criticalStockCount}
        </p>
        <p className="mt-1 text-xs text-bb-muted">Low reserve warning</p>
      </div>

      {/* Out of Stock */}
      <div className="glass rounded-2xl p-4 sm:p-5 border border-bb-border">
        <p className="text-xs font-semibold uppercase tracking-wider text-bb-crimson">
          Out of Stock Groups
        </p>
        <p className="mt-1 text-2xl font-black text-bb-crimson sm:text-3xl">
          {outOfStockCount}
        </p>
        <p className="mt-1 text-xs text-bb-muted">0 units available</p>
      </div>
    </div>
  );
}
