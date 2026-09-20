import { useState, useEffect } from "react";
import type { BloodGroup } from "../../types";

const BLOOD_GROUPS: BloodGroup[] = [
  "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"
];

interface BloodBankInventoryEditorProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: Record<BloodGroup, number>;
  onSave: (updated: Record<BloodGroup, number>) => Promise<void>;
  saving: boolean;
}

export default function BloodBankInventoryEditor({
  isOpen,
  onClose,
  inventory,
  onSave,
  saving,
}: BloodBankInventoryEditorProps) {
  const [draft, setDraft] = useState<Record<BloodGroup, number>>({ ...inventory });

  useEffect(() => {
    if (isOpen) {
      setDraft({
        "A+": inventory["A+"] ?? 0,
        "A-": inventory["A-"] ?? 0,
        "B+": inventory["B+"] ?? 0,
        "B-": inventory["B-"] ?? 0,
        "AB+": inventory["AB+"] ?? 0,
        "AB-": inventory["AB-"] ?? 0,
        "O+": inventory["O+"] ?? 0,
        "O-": inventory["O-"] ?? 0,
      });
    }
  }, [isOpen, inventory]);

  if (!isOpen) return null;

  const handleChange = (group: BloodGroup, value: number) => {
    setDraft((prev) => ({
      ...prev,
      [group]: Math.max(0, value),
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(draft);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg glass rounded-2xl border border-bb-border bg-white/95 shadow-2xl overflow-hidden">
        <form onSubmit={handleSave}>
          <div className="px-6 py-4 border-b border-bb-border flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-bb-text">Update Inventory Stock</h2>
              <p className="text-xs text-bb-muted">Adjust units in stock for each blood group</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="size-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-bb-muted hover:text-bb-text"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {BLOOD_GROUPS.map((group) => {
              const currentVal = draft[group] ?? 0;

              return (
                <div key={group} className="rounded-xl border border-bb-border bg-slate-50/60 p-3 text-center space-y-1.5">
                  <span className="font-mono text-xs font-bold text-bb-crimson">{group}</span>
                  <input
                    type="number"
                    min={0}
                    value={currentVal}
                    onChange={(e) => handleChange(group, Number(e.target.value))}
                    className="w-full text-center rounded-lg border border-bb-border bg-white py-1.5 font-mono text-base font-black text-bb-text outline-none focus:ring-2 focus:ring-bb-crimson"
                  />
                  <div className="flex justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleChange(group, currentVal - 1)}
                      className="size-6 rounded bg-slate-200 text-xs font-bold hover:bg-slate-300"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChange(group, currentVal + 1)}
                      className="size-6 rounded bg-slate-200 text-xs font-bold hover:bg-slate-300"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-6 py-4 border-t border-bb-border flex items-center justify-end gap-3 bg-slate-50/50">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-bb-border px-4 py-2 text-xs font-semibold text-bb-muted hover:bg-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-bb-crimson px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-bb-crimson-bright transition disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Stock Counts"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
