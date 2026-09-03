import { useState } from "react";
import type { BloodGroup, Urgency } from "../types";
import BloodGroupBadge from "./BloodGroupBadge";
import UrgencyBadge from "./UrgencyBadge";

interface Props {
  onClose: () => void;
  onSubmit: (data: {
    patientReference: string;
    bloodGroup: BloodGroup;
    unitsRequired: number;
    urgency: Urgency;
    notes?: string;
  }) => void | Promise<void>;
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

const URGENCIES: Urgency[] = [
  "NORMAL",
  "URGENT",
  "CRITICAL",
];

export default function CreateRequestFlow({
  onClose,
  onSubmit,
}: Props) {
  const [patientReference, setPatientReference] =
    useState("");

  const [bloodGroup, setBloodGroup] =
    useState<BloodGroup>("O+");

  const [units, setUnits] = useState(1);

  const [urgency, setUrgency] =
    useState<Urgency>("URGENT");

  const [notes, setNotes] = useState("");

  const [processing, setProcessing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const handleSubmit = async () => {
    if (!patientReference.trim()) {
      setError(
        "Please enter a patient reference.",
      );
      return;
    }

    if (units < 1 || units > 20) {
      setError(
        "Units required must be between 1 and 20.",
      );
      return;
    }

    setError(null);
    setProcessing(true);

    try {
      await onSubmit({
        patientReference:
          patientReference.trim(),

        bloodGroup,

        unitsRequired: units,

        urgency,

        notes: notes.trim() || undefined,
      });
    } catch (err) {
      console.error(
        "Failed to create blood request:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to create blood request.",
      );

      setProcessing(false);
    }
  };

  /*
   * Real API processing state.
   *
   * No artificial/fake steps are shown here.
   * The screen remains visible only while
   * the actual onSubmit API operation is running.
   */
  if (processing) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-bb-bg/80 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Creating blood request"
      >
        <div className="glass rounded-2xl p-8 w-full max-w-sm text-center animate-slide-up">
          <div className="flex justify-center mb-5">
            <div className="relative size-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-bb-crimson/30 animate-ping" />

              <div className="size-11 rounded-full bg-bb-crimson/15 border border-bb-crimson/50 flex items-center justify-center">
                <svg
                  className="size-5 text-bb-crimson-bright animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />

                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <h3 className="font-bold text-bb-text">
            Creating Blood Request
          </h3>

          <p className="text-sm text-bb-muted mt-2">
            Saving your request to the BloodBridge
            network...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-bb-bg/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Create blood request"
    >
      <div className="glass rounded-2xl w-full max-w-lg animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-bb-border">
          <div>
            <h2 className="font-bold text-bb-text">
              New Blood Request
            </h2>

            <p className="text-xs text-bb-muted mt-0.5">
              Enter the patient's blood requirement
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-lg bg-bb-surface border border-bb-border flex items-center justify-center text-bb-muted hover:text-bb-text transition-colors"
            aria-label="Close"
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
                d="M6 18L18 6M6 6l12-12"
              />
            </svg>
          </button>
        </div>

        {/* Single-step indicator */}
        <div className="h-0.5 bg-bb-border">
          <div
            className="h-full bg-bb-crimson w-full"
            aria-hidden="true"
          />
        </div>

        {/* Form */}
        <div className="p-5 space-y-5">
          {/* Patient Reference */}
          <div>
            <label
              htmlFor="patient-reference"
              className="block text-xs font-semibold uppercase tracking-widest text-bb-muted mb-2"
            >
              Patient Reference
            </label>

            <input
              id="patient-reference"
              type="text"
              value={patientReference}
              onChange={(event) => {
                setPatientReference(
                  event.target.value,
                );
                setError(null);
              }}
              placeholder="e.g. PAT-2026-001"
              maxLength={100}
              disabled={processing}
              className="w-full px-4 py-3 rounded-xl border border-bb-border bg-bb-surface text-bb-text text-sm outline-none focus:border-bb-crimson/60 transition-colors disabled:opacity-50"
            />

            <p className="text-xs text-bb-muted mt-1.5">
              Use a hospital patient ID or internal
              reference. Avoid unnecessary personal
              information.
            </p>
          </div>

          {/* Blood Group */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-bb-muted mb-2">
              Blood Group
            </label>

            <div className="grid grid-cols-4 gap-2">
              {BLOOD_GROUPS.map((group) => (
                <button
                  type="button"
                  key={group}
                  onClick={() => {
                    setBloodGroup(group);
                    setError(null);
                  }}
                  disabled={processing}
                  className={`py-2.5 rounded-xl font-mono font-bold text-sm transition-all border ${
                    bloodGroup === group
                      ? "bg-bb-crimson/20 border-bb-crimson text-bb-crimson-bright"
                      : "border-bb-border text-bb-muted hover:border-bb-border-light hover:text-bb-dim"
                  } disabled:opacity-50`}
                >
                  {group}
                </button>
              ))}
            </div>

            <div className="mt-3">
              <BloodGroupBadge
                group={bloodGroup}
                size="sm"
              />
            </div>
          </div>

          {/* Units */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-bb-muted mb-2">
              Units Required
            </label>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() =>
                  setUnits(
                    Math.max(1, units - 1),
                  )
                }
                disabled={processing}
                className="size-10 rounded-xl border border-bb-border flex items-center justify-center text-bb-text hover:border-bb-border-light font-bold text-lg transition-colors disabled:opacity-50"
                aria-label="Decrease units"
              >
                −
              </button>

              <span className="font-mono text-3xl font-bold text-bb-text w-12 text-center">
                {units}
              </span>

              <button
                type="button"
                onClick={() =>
                  setUnits(
                    Math.min(20, units + 1),
                  )
                }
                disabled={processing}
                className="size-10 rounded-xl border border-bb-border flex items-center justify-center text-bb-text hover:border-bb-border-light font-bold text-lg transition-colors disabled:opacity-50"
                aria-label="Increase units"
              >
                +
              </button>

              <span className="text-xs text-bb-muted">
                Maximum 20 units
              </span>
            </div>
          </div>

          {/* Urgency */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-bb-muted mb-2">
              Urgency Level
            </label>

            <div className="grid grid-cols-3 gap-2">
              {URGENCIES.map((level) => (
                <button
                  type="button"
                  key={level}
                  onClick={() => {
                    setUrgency(level);
                    setError(null);
                  }}
                  disabled={processing}
                  className={`py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                    urgency === level
                      ? "border-bb-border-light bg-bb-panel"
                      : "border-bb-border bg-transparent hover:border-bb-border-light"
                  } disabled:opacity-50`}
                >
                  <UrgencyBadge
                    urgency={level}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="request-notes"
              className="block text-xs font-semibold uppercase tracking-widest text-bb-muted mb-2"
            >
              Notes{" "}
              <span className="normal-case tracking-normal font-normal">
                (optional)
              </span>
            </label>

            <textarea
              id="request-notes"
              value={notes}
              onChange={(event) => {
                setNotes(event.target.value);
                setError(null);
              }}
              placeholder="Additional requirement details..."
              rows={3}
              maxLength={500}
              disabled={processing}
              className="w-full px-4 py-3 rounded-xl border border-bb-border bg-bb-surface text-bb-text text-sm outline-none focus:border-bb-crimson/60 transition-colors resize-none disabled:opacity-50"
            />

            <p className="text-[11px] text-bb-muted mt-1 text-right">
              {notes.length}/500
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3">
              <p className="text-xs text-red-600 font-semibold">
                {error}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-bb-border">
          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="px-4 py-2.5 rounded-xl border border-bb-border text-sm text-bb-muted hover:text-bb-text hover:border-bb-border-light transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={processing}
            className="px-5 py-2.5 rounded-xl bg-bb-crimson border border-bb-crimson text-white text-sm font-bold hover:bg-bb-crimson-bright transition-colors glow-crimson disabled:opacity-50"
          >
            Create Blood Request
          </button>
        </div>
      </div>
    </div>
  );
}