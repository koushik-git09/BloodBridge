import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { BloodGroup } from "../types";
import { logout } from "../services/authService";
import InventoryMatrix from "../components/InventoryMatrix";
import UrgencyBadge from "../components/UrgencyBadge";
import BloodGroupBadge from "../components/BloodGroupBadge";

import {
  getBloodBankInventory,
  getBloodBankReservations,
  updateBloodBankInventory,
  respondToReservation,
  type BloodBankReservationResponse,
  type ReservationAction,
} from "../services/bloodBankService";

interface DisplayRequest {
  id: string;
  requestId: string;
  bloodGroup: BloodGroup;
  unitsRequired: number;
  hospital: string;
  distance: number;
  requestedAt: string;
  urgency: "NORMAL" | "URGENT" | "CRITICAL";
  status: string;
}

const BLOOD_GROUPS: BloodGroup[] = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
];

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

function formatRequestTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function mapReservationToRequest(
  reservation: BloodBankReservationResponse,
  index: number,
): DisplayRequest {
  return {
    id: reservation.id,
    requestId: reservation.request_id,
    bloodGroup: reservation.blood_group,
    unitsRequired: reservation.units_requested,
    hospital: `Hospital Request #${index + 1}`,
    distance: reservation.distance,
    requestedAt: formatRequestTime(reservation.created_at),
    urgency: "NORMAL",
    status: reservation.status,
  };
}

export default function BloodBankDashboard() {
  const navigate = useNavigate();

  const [inventory, setInventory] =
    useState<Record<BloodGroup, number>>(EMPTY_INVENTORY);

  const [requests, setRequests] = useState<DisplayRequest[]>([]);

  const [highlightGroup, setHighlightGroup] = useState<
    BloodGroup | undefined
  >();

  const [toast, setToast] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [inventoryName, setInventoryName] = useState("Blood Bank");

  const [inventoryStatus, setInventoryStatus] = useState<"ACTIVE" | "INACTIVE">(
    "ACTIVE",
  );

  const [showInventoryEditor, setShowInventoryEditor] = useState(false);

  const [editingInventory, setEditingInventory] =
    useState<Record<BloodGroup, number>>(EMPTY_INVENTORY);

  const [savingInventory, setSavingInventory] = useState(false);

  /*
   * Reservation response modal
   */
  const [selectedRequest, setSelectedRequest] = useState<DisplayRequest | null>(
    null,
  );

  const [responseAction, setResponseAction] =
    useState<ReservationAction | null>(null);

  const [responseUnits, setResponseUnits] = useState(0);

  const [responding, setResponding] = useState(false);

  const totalUnits = Object.values(inventory).reduce(
    (sum, value) => sum + value,
    0,
  );

  const outOfStockCount = Object.values(inventory).filter(
    (value) => value === 0,
  ).length;

  const criticalStockCount = Object.values(inventory).filter(
    (value) => value > 0 && value <= 2,
  ).length;

  const showToast = (message: string) => {
    setToast(message);

    window.setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  async function loadDashboard() {
    try {
      setLoading(true);
      setError(null);

      const [inventoryResponse, reservationsResponse] = await Promise.all([
        getBloodBankInventory(),
        getBloodBankReservations(),
      ]);

      const normalizedInventory: Record<BloodGroup, number> = {
        ...EMPTY_INVENTORY,
        ...inventoryResponse.inventory,
      };

      setInventory(normalizedInventory);

      setInventoryName(inventoryResponse.name || "Blood Bank");

      setInventoryStatus(inventoryResponse.status || "ACTIVE");

      const mappedRequests = reservationsResponse
        .filter((reservation) => reservation.status === "PENDING")
        .map(mapReservationToRequest);

      setRequests(mappedRequests);
    } catch (err) {
      console.error("Failed to load blood bank dashboard:", err);

      setError(
        err instanceof Error ? err.message : "Failed to load blood bank data",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function handleSaveInventory() {
    try {
      setSavingInventory(true);

      const updatedInventory = await updateBloodBankInventory(editingInventory);

      const normalizedInventory: Record<BloodGroup, number> = {
        ...EMPTY_INVENTORY,
        ...updatedInventory.inventory,
      };

      setInventory(normalizedInventory);

      setInventoryName(updatedInventory.name || inventoryName);

      setInventoryStatus(updatedInventory.status || inventoryStatus);

      setShowInventoryEditor(false);

      showToast("✓ Blood inventory updated successfully");
    } catch (err) {
      console.error("Failed to update blood bank inventory:", err);

      showToast(
        err instanceof Error ? err.message : "Failed to update inventory",
      );
    } finally {
      setSavingInventory(false);
    }
  }

  function openInventoryEditor() {
    setEditingInventory({
      ...EMPTY_INVENTORY,
      ...inventory,
    });

    setShowInventoryEditor(true);
  }

  function closeInventoryEditor() {
    if (savingInventory) {
      return;
    }

    setShowInventoryEditor(false);
  }

  /*
   * Open reservation response modal.
   */
  function openReservationResponse(
    request: DisplayRequest,
    action: ReservationAction,
    units: number,
  ) {
    setSelectedRequest(request);
    setResponseAction(action);
    setResponseUnits(units);
  }

  function closeReservationResponse() {
    if (responding) {
      return;
    }

    setSelectedRequest(null);
    setResponseAction(null);
    setResponseUnits(0);
  }

  /*
   * Send CONFIRM / PARTIAL / REJECT to backend.
   */
  async function handleReservationResponse() {
    if (!selectedRequest || !responseAction) {
      return;
    }

    try {
      setResponding(true);

      await respondToReservation(
        selectedRequest.id,
        responseAction,
        responseUnits,
      );

      /*
       * Reload everything from MongoDB.
       *
       * This is important because the backend
       * updates both the reservation and inventory.
       */
      await loadDashboard();

      let message = "";

      if (responseAction === "CONFIRM") {
        message = `✓ ${responseUnits} units of ${selectedRequest.bloodGroup} confirmed`;
      } else if (responseAction === "PARTIAL") {
        message = `✓ ${responseUnits} units of ${selectedRequest.bloodGroup} partially confirmed`;
      } else {
        message = "✓ Reservation rejected";
      }

      closeReservationResponse();

      showToast(message);
    } catch (err) {
      console.error("Failed to respond to reservation:", err);

      showToast(
        err instanceof Error ? err.message : "Failed to respond to reservation",
      );
    } finally {
      setResponding(false);
    }
  }

  return (
    <div className="h-screen flex flex-col bg-bb-bg text-bb-text overflow-hidden">
      {/* Header */}
      <header className="glass border-b border-bb-border shrink-0 z-30">
        <div className="flex items-center justify-between px-4 sm:px-6 h-14">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="size-8 rounded-lg border border-bb-border flex items-center justify-center text-bb-muted hover:text-bb-text transition-colors"
              aria-label="Back to home"
            >
              <svg
                className="size-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate("/roles", { replace: true });
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-bb-border text-bb-muted text-sm font-semibold hover:text-bb-crimson hover:border-bb-crimson/40 transition-colors"
              aria-label="Logout"
            >
              <svg
                className="size-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h5a2 2 0 012 2v1"
                />
              </svg>

              <span className="hidden sm:block">Logout</span>
            </button>
            <div>
              <p className="font-bold text-sm text-bb-text">
                Blood Bank Operations Center
              </p>

              <p className="font-mono text-xs text-bb-muted">
                {inventoryName} ·{" "}
                {inventoryStatus === "ACTIVE" ? "Verified" : "Inactive"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-bb-teal/30 bg-bb-teal/10">
            <span
              className="size-1.5 rounded-full bg-bb-teal animate-blink"
              aria-hidden="true"
            />

            <span className="font-mono text-xs text-bb-teal font-bold">
              {inventoryStatus}
            </span>
          </div>
        </div>
      </header>

      {/* Metrics */}
      <div className="glass border-b border-bb-border shrink-0">
        <div className="flex overflow-x-auto divide-x divide-bb-border">
          {[
            {
              value: totalUnits,
              label: "Total Units",
              color: "#e2e8f0",
            },
            {
              value: outOfStockCount,
              label: "Out of Stock",
              color: "#c01832",
            },
            {
              value: criticalStockCount,
              label: "Critical Stock",
              color: "#f59e0b",
            },
            {
              value: requests.length,
              label: "Pending Requests",
              color: "#818cf8",
            },
          ].map((metric) => (
            <div
              key={metric.label}
              className="flex items-center gap-2.5 px-5 py-3 min-w-max"
            >
              <div>
                <p
                  className="font-mono font-bold text-lg leading-none"
                  style={{
                    color: metric.color,
                  }}
                >
                  {metric.value}
                </p>

                <p className="text-xs text-bb-muted mt-0.5">{metric.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
          {/* Error */}
          {error && (
            <div className="glass rounded-2xl p-4 border border-bb-crimson/30 bg-bb-crimson/5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-bb-crimson-bright">
                    Unable to load blood bank data
                  </p>

                  <p className="text-sm text-bb-muted mt-1">{error}</p>
                </div>

                <button
                  onClick={loadDashboard}
                  className="shrink-0 px-4 py-2 rounded-xl border border-bb-border text-sm font-semibold text-bb-text hover:border-bb-border-light transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div className="glass rounded-2xl p-12 text-center">
              <div className="mx-auto size-8 rounded-full border-2 border-bb-border border-t-bb-crimson-bright animate-spin" />

              <p className="text-sm text-bb-muted mt-4">
                Loading blood bank operations...
              </p>
            </div>
          ) : (
            <>
              {/* Inventory */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="font-bold text-bb-text">
                      Blood Inventory Matrix
                    </h2>

                    <p className="text-xs text-bb-muted mt-0.5">
                      Click a group to highlight related requests
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={openInventoryEditor}
                      className="text-xs text-bb-muted hover:text-bb-text transition-colors font-mono border border-bb-border rounded-lg px-3 py-1.5 hover:border-bb-border-light"
                    >
                      + Update Inventory
                    </button>

                    <button
                      onClick={loadDashboard}
                      className="text-xs text-bb-muted hover:text-bb-text transition-colors font-mono border border-bb-border rounded-lg px-3 py-1.5 hover:border-bb-border-light"
                    >
                      ↻ Refresh
                    </button>
                  </div>
                </div>

                <div className="glass rounded-2xl p-4">
                  <InventoryMatrix
                    inventory={inventory}
                    onGroupClick={(group) =>
                      setHighlightGroup(
                        highlightGroup === group ? undefined : group,
                      )
                    }
                    highlightGroup={highlightGroup}
                  />
                </div>
              </section>

              {/* Requests */}
              <section>
                <h2 className="font-bold text-bb-text mb-3">
                  Incoming Hospital Requests
                  {requests.length > 0 && (
                    <span className="ml-2 inline-flex size-5 items-center justify-center rounded-full bg-bb-crimson/20 border border-bb-crimson/40 text-bb-crimson-bright font-mono text-xs">
                      {requests.length}
                    </span>
                  )}
                </h2>

                {requests.length === 0 ? (
                  <div className="glass rounded-2xl p-10 text-center">
                    <p className="text-2xl mb-3" aria-hidden="true">
                      🏦
                    </p>

                    <p className="font-semibold text-bb-text">
                      No pending requests
                    </p>

                    <p className="text-bb-muted text-sm mt-1">
                      New verified requests from hospitals will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {requests.map((request) => {
                      const availableUnits = inventory[request.bloodGroup] ?? 0;

                      const canFulfill =
                        availableUnits >= request.unitsRequired;

                      const offerUnits = Math.min(
                        availableUnits,
                        request.unitsRequired,
                      );

                      return (
                        <div
                          key={request.id}
                          className={`glass rounded-2xl p-5 border transition-all ${
                            request.urgency === "CRITICAL"
                              ? "border-bb-crimson/30"
                              : "border-bb-border"
                          }`}
                        >
                          {/* Request heading */}
                          <div className="flex flex-wrap items-start gap-4 justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <BloodGroupBadge
                                group={request.bloodGroup}
                                size="md"
                              />

                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono font-bold text-xl text-bb-text">
                                    {request.unitsRequired} units
                                  </span>

                                  <UrgencyBadge urgency={request.urgency} />
                                </div>

                                <p className="text-xs text-bb-muted mt-0.5">
                                  {request.hospital} · {request.distance} km ·{" "}
                                  {request.requestedAt}
                                </p>

                                <p className="text-[11px] text-bb-dim mt-1 font-mono">
                                  Request ID: {request.requestId}
                                </p>
                              </div>
                            </div>

                            <div className="text-right">
                              <p className="text-xs text-bb-muted">
                                Your stock
                              </p>

                              <p
                                className={`font-mono font-bold text-xl ${
                                  availableUnits === 0
                                    ? "text-bb-crimson-bright"
                                    : availableUnits < request.unitsRequired
                                      ? "text-bb-amber"
                                      : "text-bb-teal"
                                }`}
                              >
                                {availableUnits} units
                              </p>
                            </div>
                          </div>

                          {/* Stock indicator */}
                          <div className="mb-4 p-3 rounded-xl border border-bb-border bg-bb-surface space-y-2">
                            <div className="flex justify-between text-xs font-mono text-bb-muted">
                              <span>Required: {request.unitsRequired}</span>

                              <span>Available: {availableUnits}</span>

                              <span>Can Offer: {offerUnits}</span>
                            </div>

                            <div className="progress-bar">
                              <div
                                className="progress-fill"
                                style={{
                                  width: `${Math.min(
                                    (availableUnits / request.unitsRequired) *
                                      100,
                                    100,
                                  )}%`,
                                  background: canFulfill
                                    ? "#10b981"
                                    : availableUnits > 0
                                      ? "#f59e0b"
                                      : "#c01832",
                                }}
                              />
                            </div>
                          </div>

                          {/* Actions */}
                          {offerUnits > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              {canFulfill && (
                                <button
                                  onClick={() =>
                                    openReservationResponse(
                                      request,
                                      "CONFIRM",
                                      request.unitsRequired,
                                    )
                                  }
                                  className="py-2.5 rounded-xl bg-bb-teal/15 border border-bb-teal/40 text-bb-teal-bright font-semibold text-sm hover:bg-bb-teal/25 transition-colors"
                                >
                                  Confirm {request.unitsRequired} Units
                                </button>
                              )}

                              <button
                                onClick={() =>
                                  openReservationResponse(
                                    request,
                                    "PARTIAL",
                                    offerUnits,
                                  )
                                }
                                className="py-2.5 rounded-xl bg-bb-amber/10 border border-bb-amber/30 text-bb-amber font-semibold text-sm hover:bg-bb-amber/15 transition-colors"
                              >
                                Partial {offerUnits} Unit
                                {offerUnits !== 1 ? "s" : ""}
                              </button>

                              <button
                                onClick={() =>
                                  openReservationResponse(request, "REJECT", 0)
                                }
                                className="py-2.5 rounded-xl border border-bb-border text-bb-muted font-semibold text-sm hover:text-bb-text hover:border-bb-border-light transition-colors"
                              >
                                Cannot Fulfill
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() =>
                                openReservationResponse(request, "REJECT", 0)
                              }
                              className="w-full py-2.5 rounded-xl bg-bb-crimson/10 border border-bb-crimson/30 text-bb-crimson-bright font-semibold text-sm hover:bg-bb-crimson/15 transition-colors"
                            >
                              Reject — Out of Stock
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>

      {/* Inventory Editor Modal */}
      {showInventoryEditor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeInventoryEditor();
            }
          }}
        >
          <div className="glass w-full max-w-lg rounded-2xl border border-bb-border shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-bb-border">
              <div>
                <h3 className="font-bold text-bb-text">
                  Update Blood Inventory
                </h3>

                <p className="text-xs text-bb-muted mt-1">
                  Enter the current available units for each blood group.
                </p>
              </div>

              <button
                onClick={closeInventoryEditor}
                disabled={savingInventory}
                className="size-8 rounded-lg border border-bb-border text-bb-muted hover:text-bb-text transition-colors disabled:opacity-50"
                aria-label="Close inventory editor"
              >
                ✕
              </button>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-2 gap-3">
                {BLOOD_GROUPS.map((group) => (
                  <div key={group}>
                    <label
                      htmlFor={`inventory-${group}`}
                      className="block text-xs font-semibold text-bb-muted mb-1.5"
                    >
                      {group}
                    </label>

                    <input
                      id={`inventory-${group}`}
                      type="number"
                      min="0"
                      step="1"
                      value={editingInventory[group]}
                      onChange={(event) => {
                        const rawValue = event.target.value;

                        const value =
                          rawValue === ""
                            ? 0
                            : Math.max(0, Math.floor(Number(rawValue)));

                        setEditingInventory((previous) => ({
                          ...previous,
                          [group]: value,
                        }));
                      }}
                      className="w-full rounded-xl border border-bb-border bg-bb-surface px-3 py-2.5 text-sm font-mono text-bb-text outline-none focus:border-bb-crimson/50"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl border border-bb-border bg-bb-surface px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-bb-muted">Total inventory</span>

                  <span className="font-mono font-bold text-bb-text">
                    {Object.values(editingInventory).reduce(
                      (sum, value) => sum + value,
                      0,
                    )}{" "}
                    units
                  </span>
                </div>
              </div>

              <div className="flex gap-2 mt-5">
                <button
                  onClick={closeInventoryEditor}
                  disabled={savingInventory}
                  className="flex-1 py-2.5 rounded-xl border border-bb-border text-bb-muted font-semibold text-sm hover:text-bb-text hover:border-bb-border-light transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  onClick={handleSaveInventory}
                  disabled={savingInventory}
                  className="flex-1 py-2.5 rounded-xl bg-bb-teal/15 border border-bb-teal/40 text-bb-teal-bright font-semibold text-sm hover:bg-bb-teal/25 transition-colors disabled:opacity-50"
                >
                  {savingInventory ? "Saving..." : "Save Inventory"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reservation Response Modal */}
      {selectedRequest && responseAction && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeReservationResponse();
            }
          }}
        >
          <div className="glass w-full max-w-md rounded-2xl border border-bb-border shadow-2xl">
            <div className="px-5 py-4 border-b border-bb-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-bb-text">
                    Reservation Response
                  </h3>

                  <p className="text-xs text-bb-muted mt-1">
                    Review this action before updating the reservation.
                  </p>
                </div>

                <button
                  onClick={closeReservationResponse}
                  disabled={responding}
                  className="size-8 rounded-lg border border-bb-border text-bb-muted hover:text-bb-text transition-colors disabled:opacity-50"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="rounded-xl border border-bb-border bg-bb-surface p-4">
                <div className="flex items-center gap-3">
                  <BloodGroupBadge
                    group={selectedRequest.bloodGroup}
                    size="md"
                  />

                  <div>
                    <p className="font-semibold text-bb-text">
                      {selectedRequest.unitsRequired} units requested
                    </p>

                    <p className="text-xs text-bb-muted mt-1">
                      {selectedRequest.hospital}
                    </p>
                  </div>
                </div>
              </div>

              {responseAction === "CONFIRM" && (
                <div className="rounded-xl border border-bb-teal/30 bg-bb-teal/5 p-4">
                  <p className="text-sm font-semibold text-bb-teal-bright">
                    Confirm full request
                  </p>

                  <p className="text-xs text-bb-muted mt-1">
                    You are confirming {selectedRequest.unitsRequired} units of{" "}
                    {selectedRequest.bloodGroup}.
                  </p>
                </div>
              )}

              {responseAction === "PARTIAL" && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-bb-muted">
                    Units to confirm
                  </label>

                  <input
                    type="number"
                    min="1"
                    max={Math.min(
                      selectedRequest.unitsRequired - 1,
                      inventory[selectedRequest.bloodGroup],
                    )}
                    value={responseUnits}
                    onChange={(event) => {
                      const maxUnits = Math.min(
                        selectedRequest.unitsRequired - 1,
                        inventory[selectedRequest.bloodGroup],
                      );

                      const value = Math.min(
                        Math.max(1, Number(event.target.value)),
                        maxUnits,
                      );

                      setResponseUnits(value);
                    }}
                    className="w-full rounded-xl border border-bb-border bg-bb-surface px-3 py-2.5 text-sm font-mono text-bb-text outline-none focus:border-bb-amber/50"
                  />

                  <p className="text-[11px] text-bb-muted">
                    Available: {inventory[selectedRequest.bloodGroup]} units ·
                    Maximum partial confirmation:{" "}
                    {Math.min(
                      selectedRequest.unitsRequired - 1,
                      inventory[selectedRequest.bloodGroup],
                    )}
                  </p>
                </div>
              )}

              {responseAction === "REJECT" && (
                <div className="rounded-xl border border-bb-crimson/30 bg-bb-crimson/5 p-4">
                  <p className="text-sm font-semibold text-bb-crimson-bright">
                    Reject reservation
                  </p>

                  <p className="text-xs text-bb-muted mt-1">
                    No blood units will be deducted from your inventory.
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={closeReservationResponse}
                  disabled={responding}
                  className="flex-1 py-2.5 rounded-xl border border-bb-border text-bb-muted font-semibold text-sm hover:text-bb-text transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  onClick={handleReservationResponse}
                  disabled={
                    responding ||
                    (responseAction === "PARTIAL" && responseUnits <= 0)
                  }
                  className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 ${
                    responseAction === "REJECT"
                      ? "bg-bb-crimson/15 border border-bb-crimson/40 text-bb-crimson-bright hover:bg-bb-crimson/25"
                      : responseAction === "PARTIAL"
                        ? "bg-bb-amber/15 border border-bb-amber/40 text-bb-amber hover:bg-bb-amber/25"
                        : "bg-bb-teal/15 border border-bb-teal/40 text-bb-teal-bright hover:bg-bb-teal/25"
                  }`}
                >
                  {responding
                    ? "Processing..."
                    : responseAction === "CONFIRM"
                      ? "Confirm Reservation"
                      : responseAction === "PARTIAL"
                        ? "Confirm Partial"
                        : "Reject Reservation"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] glass rounded-xl px-5 py-3 border border-bb-teal/40 text-bb-teal-bright text-sm font-semibold animate-slide-up shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
