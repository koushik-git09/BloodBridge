import type { BloodGroup } from '../types';

interface Props {
  inventory: Record<BloodGroup, number>;
  onGroupClick?: (group: BloodGroup) => void;
  highlightGroup?: BloodGroup;
}

const GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

function stockLevel(units: number): { label: string; color: string; bg: string; border: string } {
  if (units === 0) return { label: 'OUT', color: '#c01832', bg: 'rgba(192,24,50,0.1)', border: 'rgba(192,24,50,0.35)' };
  if (units <= 2) return { label: 'CRITICAL', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.35)' };
  if (units <= 5) return { label: 'LOW', color: '#818cf8', bg: 'rgba(129,140,248,0.1)', border: 'rgba(129,140,248,0.35)' };
  return { label: 'OK', color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.35)' };
}

export default function InventoryMatrix({ inventory, onGroupClick, highlightGroup }: Props) {
  return (
    <div className="grid grid-cols-4 gap-2" role="list" aria-label="Blood inventory by group">
      {GROUPS.map((group) => {
        const units = inventory[group] ?? 0;
        const { label, color, bg, border } = stockLevel(units);
        const isHighlighted = highlightGroup === group;
        return (
          <button
            key={group}
            role="listitem"
            onClick={() => onGroupClick?.(group)}
            className="flex flex-col items-center gap-1 rounded-xl py-3 px-2 transition-all duration-200 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-bb-indigo"
            style={{
              background: isHighlighted ? bg : 'rgba(255,255,255,0.03)',
              border: `1px solid ${isHighlighted ? border : 'rgba(26,42,69,0.8)'}`,
            }}
            aria-label={`${group}: ${units} units, ${label} stock`}
          >
            <span className="font-mono text-sm font-bold" style={{ color }}>
              {group}
            </span>
            <span className="font-mono text-2xl font-bold text-bb-text">{units}</span>
            <span
              className="rounded px-1.5 py-0.5 font-mono text-xs font-bold tracking-widest"
              style={{ color, background: bg, border: `1px solid ${border}` }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
