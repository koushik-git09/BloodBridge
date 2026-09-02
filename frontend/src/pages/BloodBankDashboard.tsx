import { useState } from 'react';
import type { BloodGroup, Page } from '../types';
import { bloodBankInventory, incomingBBRequests } from '../data/mock';
import InventoryMatrix from '../components/InventoryMatrix';
import UrgencyBadge from '../components/UrgencyBadge';
import BloodGroupBadge from '../components/BloodGroupBadge';

interface Props {
  onNavigate: (page: Page) => void;
}

export default function BloodBankDashboard({ onNavigate }: Props) {
  const [inventory, setInventory] = useState<Record<BloodGroup, number>>(bloodBankInventory as Record<BloodGroup, number>);
  const [requests, setRequests] = useState(incomingBBRequests);
  const [highlightGroup, setHighlightGroup] = useState<BloodGroup | undefined>();
  const [toast, setToast] = useState<string | null>(null);

  const totalUnits = Object.values(inventory).reduce((s, v) => s + v, 0);

  const handleOffer = (reqId: string, units: number, bloodGroup: BloodGroup) => {
    setInventory(prev => ({
      ...prev,
      [bloodGroup]: Math.max(0, prev[bloodGroup] - units),
    }));
    setRequests(prev => prev.filter(r => r.id !== reqId));
    showToast(`✓ ${units} units of ${bloodGroup} reserved for hospital`);
  };

  const handleDecline = (reqId: string) => {
    setRequests(prev => prev.filter(r => r.id !== reqId));
    showToast('Request declined');
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="h-screen flex flex-col bg-bb-bg text-bb-text overflow-hidden">
      {/* Header */}
      <header className="glass border-b border-bb-border shrink-0 z-30">
        <div className="flex items-center justify-between px-4 sm:px-6 h-14">
          <div className="flex items-center gap-3">
            <button onClick={() => onNavigate('role-select')} className="size-8 rounded-lg border border-bb-border flex items-center justify-center text-bb-muted hover:text-bb-text transition-colors" aria-label="Back to role select">
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div>
              <p className="font-bold text-sm text-bb-text">Blood Bank Operations Center</p>
              <p className="font-mono text-xs text-bb-muted">Chennai Blood Centre · Verified</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-bb-teal/30 bg-bb-teal/10">
            <span className="size-1.5 rounded-full bg-bb-teal animate-blink" aria-hidden="true" />
            <span className="font-mono text-xs text-bb-teal font-bold">ACTIVE</span>
          </div>
        </div>
      </header>

      {/* Metric strip */}
      <div className="glass border-b border-bb-border shrink-0">
        <div className="flex overflow-x-auto divide-x divide-bb-border">
          {[
            { value: totalUnits, label: 'Total Units', color: '#e2e8f0' },
            { value: Object.values(inventory).filter(v => v === 0).length, label: 'Out of Stock', color: '#c01832' },
            { value: Object.values(inventory).filter(v => v > 0 && v <= 2).length, label: 'Critical Stock', color: '#f59e0b' },
            { value: requests.length, label: 'Pending Requests', color: '#818cf8' },
          ].map(m => (
            <div key={m.label} className="flex items-center gap-2.5 px-5 py-3 min-w-max">
              <div>
                <p className="font-mono font-bold text-lg leading-none" style={{ color: m.color }}>{m.value}</p>
                <p className="text-xs text-bb-muted mt-0.5">{m.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
          {/* Inventory matrix */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-bold text-bb-text">Blood Inventory Matrix</h2>
                <p className="text-xs text-bb-muted mt-0.5">Click a group to highlight related requests</p>
              </div>
              <button className="text-xs text-bb-muted hover:text-bb-text transition-colors font-mono border border-bb-border rounded-lg px-3 py-1.5 hover:border-bb-border-light">
                + Add Stock
              </button>
            </div>
            <div className="glass rounded-2xl p-4">
              <InventoryMatrix
                inventory={inventory}
                onGroupClick={g => setHighlightGroup(highlightGroup === g ? undefined : g)}
                highlightGroup={highlightGroup}
              />
            </div>
          </section>

          {/* Incoming requests */}
          <section>
            <h2 className="font-bold text-bb-text mb-3">
              Incoming Hospital Requests
              {requests.length > 0 && (
                <span className="ml-2 inline-flex size-5 items-center justify-center rounded-full bg-bb-crimson/20 border border-bb-crimson/40 text-bb-crimson-bright font-mono text-xs">{requests.length}</span>
              )}
            </h2>
            {requests.length === 0 ? (
              <div className="glass rounded-2xl p-10 text-center">
                <p className="text-2xl mb-3" aria-hidden="true">🏦</p>
                <p className="font-semibold text-bb-text">No pending requests</p>
                <p className="text-bb-muted text-sm mt-1">New verified requests from hospitals will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map(req => {
                  const canFulfill = inventory[req.bloodGroup] >= req.unitsRequired;
                  const offerUnits = Math.min(inventory[req.bloodGroup], req.unitsRequired);
                  return (
                    <div
                      key={req.id}
                      className={`glass rounded-2xl p-5 border transition-all ${req.urgency === 'CRITICAL' ? 'border-bb-crimson/30' : 'border-bb-border'}`}
                    >
                      <div className="flex flex-wrap items-start gap-4 justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <BloodGroupBadge group={req.bloodGroup} size="md" />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-xl text-bb-text">{req.unitsRequired} units</span>
                              <UrgencyBadge urgency={req.urgency} />
                            </div>
                            <p className="text-xs text-bb-muted mt-0.5">{req.hospital} · {req.distance} km · {req.requestedAt}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-bb-muted">Your stock</p>
                          <p className={`font-mono font-bold text-xl ${inventory[req.bloodGroup] === 0 ? 'text-bb-crimson-bright' : inventory[req.bloodGroup] < req.unitsRequired ? 'text-bb-amber' : 'text-bb-teal'}`}>
                            {inventory[req.bloodGroup]} units
                          </p>
                        </div>
                      </div>

                      {/* Visual stock indicator */}
                      <div className="mb-4 p-3 rounded-xl border border-bb-border bg-bb-surface space-y-2">
                        <div className="flex justify-between text-xs font-mono text-bb-muted">
                          <span>Required: {req.unitsRequired}</span>
                          <span>Available: {inventory[req.bloodGroup]}</span>
                          <span>Can Offer: {offerUnits}</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{
                            width: `${Math.min((inventory[req.bloodGroup] / req.unitsRequired) * 100, 100)}%`,
                            background: canFulfill ? '#10b981' : inventory[req.bloodGroup] > 0 ? '#f59e0b' : '#c01832',
                          }} />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {offerUnits > 0 ? (
                          <button
                            onClick={() => handleOffer(req.id, offerUnits, req.bloodGroup)}
                            className="flex-1 py-2.5 rounded-xl bg-bb-teal/15 border border-bb-teal/40 text-bb-teal-bright font-semibold text-sm hover:bg-bb-teal/25 transition-colors"
                          >
                            Offer {offerUnits} Unit{offerUnits !== 1 ? 's' : ''}
                          </button>
                        ) : (
                          <div className="flex-1 py-2.5 rounded-xl bg-bb-crimson/10 border border-bb-crimson/30 text-bb-crimson-bright font-semibold text-sm text-center">
                            Out of Stock
                          </div>
                        )}
                        <button
                          onClick={() => handleDecline(req.id)}
                          className="px-4 py-2.5 rounded-xl border border-bb-border text-bb-muted font-semibold text-sm hover:text-bb-text hover:border-bb-border-light transition-colors"
                        >
                          Cannot Fulfill
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 glass rounded-xl px-5 py-3 border border-bb-teal/40 text-bb-teal-bright text-sm font-semibold animate-slide-up shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
