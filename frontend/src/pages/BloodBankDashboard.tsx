import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { BloodGroup } from "../types";
import { logout, getCurrentUser, type CurrentUser } from "../services/authService";
import {
  getBloodBankInventory,
  getBloodBankReservations,
  updateBloodBankInventory,
  respondToReservation,
  type BloodBankReservationResponse,
  type ReservationAction,
} from "../services/bloodBankService";

import InventoryMatrix from "../components/InventoryMatrix";
import BloodBankStats from "../components/bloodbank/BloodBankStats";
import BloodBankReservationList from "../components/bloodbank/BloodBankReservationList";
import BloodBankInventoryEditor from "../components/bloodbank/BloodBankInventoryEditor";

const EMPTY_INVENTORY: Record<BloodGroup, number> = {
  "A+": 0,
  "A-": 0,
  "B+": 0,
  "B-": 0,
  "AB+": 0,
  "AB-": 0,
  "O+": 0,
  "O-": 0,
};

export default function BloodBankDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [inventory, setInventory] = useState<Record<BloodGroup, number>>(EMPTY_INVENTORY);
  const [reservations, setReservations] = useState<BloodBankReservationResponse[]>([]);

  const [highlightGroup, setHighlightGroup] = useState<BloodGroup | undefined>();
  const [showEditor, setShowEditor] = useState(false);
  const [savingInventory, setSavingInventory] = useState(false);
  const [responding, setResponding] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3500);
  };

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [userData, invData, resData] = await Promise.all([
        getCurrentUser(),
        getBloodBankInventory(),
        getBloodBankReservations(),
      ]);

      setUser(userData);
      setInventory({
        ...EMPTY_INVENTORY,
        ...invData.inventory,
      });
      setReservations(resData);
    } catch (err) {
      console.error("Failed to load blood bank dashboard:", err);
      setError(err instanceof Error ? err.message : "Failed to load blood bank data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleSaveInventory = async (updated: Record<BloodGroup, number>) => {
    try {
      setSavingInventory(true);
      const res = await updateBloodBankInventory(updated);
      setInventory({ ...EMPTY_INVENTORY, ...res.inventory });
      setShowEditor(false);
      showToast("Inventory updated successfully.");
      await loadDashboard();
    } catch (err) {
      console.error("Failed to update inventory:", err);
      showToast(err instanceof Error ? err.message : "Failed to update inventory.");
    } finally {
      setSavingInventory(false);
    }
  };

  const handleRespondReservation = async (
    reservationId: string,
    action: ReservationAction,
    unitsConfirmed: number
  ) => {
    try {
      setResponding(true);
      await respondToReservation(reservationId, action, unitsConfirmed);
      showToast(
        action === "CONFIRM"
          ? "Reservation confirmed and blood units reserved!"
          : action === "PARTIAL"
            ? `Partial reservation (${unitsConfirmed} units) confirmed.`
            : "Reservation rejected."
      );
      await loadDashboard();
    } catch (err) {
      console.error("Failed to respond to reservation:", err);
      showToast(err instanceof Error ? err.message : "Failed to respond to reservation.");
    } finally {
      setResponding(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login/blood-bank");
  };

  const pendingCount = reservations.filter((r) => r.status === "PENDING").length;

  return (
    <div className="min-h-screen bb-network-bg text-bb-text">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-2xl animate-in fade-in slide-in-from-bottom-3">
          {toast}
        </div>
      )}

      {/* Inventory Edit Modal */}
      <BloodBankInventoryEditor
        isOpen={showEditor}
        onClose={() => setShowEditor(false)}
        inventory={inventory}
        onSave={handleSaveInventory}
        saving={savingInventory}
      />

      {/* Top Navbar */}
      <nav className="glass sticky top-0 z-40 border-b border-bb-border px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/bloodbridge-logo.png"
            alt="BloodBridge logo"
            className="size-8 object-contain"
          />
          <div>
            <span className="font-bold text-bb-text tracking-tight">
              Blood<span className="text-bb-crimson-bright">Bridge</span>
            </span>
            <span className="ml-2 rounded-md bg-bb-teal/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-bb-teal">
              Blood Bank Hub
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowEditor(true)}
            className="rounded-xl bg-bb-crimson px-3.5 py-2 text-xs font-bold text-white hover:bg-bb-crimson-bright shadow-sm transition"
          >
            Manage Inventory
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl border border-bb-border px-3.5 py-2 text-xs font-semibold text-bb-muted hover:bg-white hover:text-bb-text transition"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Dashboard Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header Greeting */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-bb-text">
              {user?.name || "Blood Bank Operations"}
            </h1>
            <p className="mt-1 text-xs text-bb-muted">
              Live inventory tracking and automated hospital reservation routing
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-bb-teal/10 border border-bb-teal/30 px-3 py-1 text-xs font-mono font-bold text-bb-teal uppercase tracking-wider">
              <span className="size-1.5 rounded-full bg-bb-teal animate-blink" />
              Active Inventory Sync
            </span>
          </div>
        </div>

        {/* Global Error Alert */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={loadDashboard}
              className="font-bold underline hover:text-red-900"
            >
              Retry
            </button>
          </div>
        )}

        {/* Statistics Metric Cards */}
        <BloodBankStats
          inventory={inventory}
          pendingReservationsCount={pendingCount}
        />

        {/* Live Inventory Grid */}
        <div className="glass rounded-2xl p-6 border border-bb-border space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-bb-text">Real-Time Blood Inventory</h2>
              <p className="text-xs text-bb-muted">
                Click any group to highlight or manage stock counts
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowEditor(true)}
              className="text-xs font-bold text-bb-crimson hover:underline"
            >
              Edit Stock Units →
            </button>
          </div>

          <InventoryMatrix
            inventory={inventory}
            highlightGroup={highlightGroup}
            onGroupClick={(group) => {
              setHighlightGroup(highlightGroup === group ? undefined : group);
            }}
          />
        </div>

        {/* Incoming Hospital Reservations */}
        <BloodBankReservationList
          reservations={reservations}
          inventory={inventory}
          onRespond={handleRespondReservation}
          responding={responding}
        />
      </main>
    </div>
  );
}
