import { useState } from 'react';
import type { Donor } from '../types';
import BloodGroupBadge from './BloodGroupBadge';

interface Props {
  donor: Donor;
  onConfirmDonation?: () => void;
  isConfirmingDonation?: boolean;
  viewMode?: 'hospital' | 'donor';
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 90 ? '#00bfb3' : value >= 70 ? '#818cf8' : value >= 50 ? '#f59e0b' : '#c01832';
  return (
    <div className="space-y-1">
      <div className="flex justify-between font-mono text-xs">
        <span className="text-bb-dim">{label}</span>
        <span style={{ color }} className="font-bold">{value}%</span>
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${value}%`, background: color }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
        />
      </div>
    </div>
  );
}

export default function DonorMatchCard({ donor, onConfirmDonation, isConfirmingDonation = false, viewMode = 'hospital' }: Props) {
  const [expanded, setExpanded] = useState(false);
  const scoreColor = donor.matchScore >= 90 ? 'text-bb-teal-bright' : donor.matchScore >= 75 ? 'text-bb-indigo' : 'text-bb-amber';
  const response = {
    PENDING: { label: 'Waiting for donor response', className: 'text-bb-amber bg-bb-amber/10 border-bb-amber/25' },
    ACCEPTED: { label: 'Donor Accepted', className: 'text-bb-teal bg-bb-teal/10 border-bb-teal/25' },
    DECLINED: { label: 'Donor Declined', className: 'text-bb-crimson bg-bb-crimson/10 border-bb-crimson/25' },
    DONATED: { label: 'Donation Confirmed', className: 'text-bb-green bg-bb-green/10 border-bb-green/25' },
  }[donor.status];

  return (
    <div className="glass rounded-xl overflow-hidden transition-all duration-200 hover:border-bb-border-light">
      <button
        className="w-full text-left p-4"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex size-10 items-center justify-center rounded-full bg-bb-indigo/15 border border-bb-indigo/30 font-bold text-bb-indigo">
                {donor.name.split(' ').map(n => n[0]).join('')}
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-bb-bg ${donor.availability === 'AVAILABLE' ? 'bg-bb-teal' : donor.availability === 'BUSY' ? 'bg-bb-amber' : 'bg-bb-muted'}`} aria-label={donor.availability} />
            </div>
            <div>
              <p className="font-semibold text-bb-text">{donor.name}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <BloodGroupBadge group={donor.bloodGroup} size="sm" />
                <span className="font-mono text-xs text-bb-muted">{donor.distance} km away</span>
                {viewMode === 'hospital' && (donor.status === 'ACCEPTED' || donor.status === 'DONATED') && donor.phone && (
                  <span className="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    📱 {donor.phone}
                  </span>
                )}
              </div>

            </div>
          </div>
          <div className="text-right shrink-0">
            <span className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold ${response.className}`}>
              {donor.status === 'DONATED' ? '✓ ' : ''}{response.label}
            </span>
            <div className={`font-mono text-2xl font-bold ${scoreColor}`}>{donor.matchScore}%</div>
            <div className="text-xs text-bb-muted">match score</div>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-bb-border px-4 pb-4 pt-3 animate-slide-up space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-bb-muted mb-2">Why This Match</p>
          <div className="space-y-2.5">
            <ScoreBar label="Blood Compatibility" value={donor.scores.compatibility} />
            <ScoreBar label="Eligibility" value={donor.scores.eligibility} />
            <ScoreBar label="Distance Score" value={donor.scores.distance} />
            <ScoreBar label="Availability" value={donor.scores.availability} />
            <ScoreBar label="Reliability" value={donor.scores.reliability} />
          </div>
          <div className="flex items-center gap-2 text-xs text-bb-muted font-mono pt-1">
            <span>Last donation: {donor.lastDonation}</span>
            <span className="text-bb-border">·</span>
            <span>{donor.responses} responses</span>
          </div>

          {/* Donor Mobile Contact Section (Visible ONLY after Donor accepts) */}
          {viewMode === 'hospital' && (donor.status === 'ACCEPTED' || donor.status === 'DONATED') && donor.phone && (
            <div className="rounded-xl bg-emerald-50/90 border border-emerald-200 p-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                  Verified Donor Contact
                </p>
                <p className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                  Mobile: <span className="text-bb-text font-bold">{donor.phone}</span>
                </p>
              </div>
              <a
                href={`tel:${donor.phone}`}
                onClick={(event) => event.stopPropagation()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition active:scale-95"
              >
                <span>📞</span>
                <span>Contact Donor</span>
              </a>
            </div>
          )}

          {viewMode === 'hospital' && donor.status === 'ACCEPTED' && onConfirmDonation && (
            <div className="pt-1">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onConfirmDonation();
                }}
                disabled={isConfirmingDonation}
                className="w-full rounded-lg bg-bb-teal/15 border border-bb-teal/30 py-2 text-xs font-semibold text-bb-teal-bright hover:bg-bb-teal/25 transition-colors disabled:opacity-50"
              >
                {isConfirmingDonation ? 'Confirming…' : 'Confirm Donation'}
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
