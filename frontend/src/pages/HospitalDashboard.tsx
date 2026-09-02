import { useState } from 'react';
import type { BloodGroup, BloodRequest, Page, Urgency } from '../types';
import { mockRequests, mockNotifications } from '../data/mock';
import UrgencyBadge from '../components/UrgencyBadge';
import BloodGroupBadge from '../components/BloodGroupBadge';
import RequestTimeline from '../components/RequestTimeline';
import DonorMatchCard from '../components/DonorMatchCard';
import CreateRequestFlow from '../components/CreateRequestFlow';
import BloodFlowNetwork from '../components/BloodFlowNetwork';

interface Props {
  onNavigate: (page: Page) => void;
}

function StatusLabel({ status }: { status: BloodRequest['status'] }) {
  const map: Record<string, { text: string; color: string }> = {
    CHECKING_BLOOD_BANK: { text: 'Scanning Banks', color: '#f59e0b' },
    PARTIAL_FULFILLMENT: { text: 'Partial', color: '#818cf8' },
    DONOR_MATCHING: { text: 'Donor Matching', color: '#818cf8' },
    FULFILLED: { text: 'Fulfilled', color: '#10b981' },
    CONFIRMED: { text: 'Confirmed', color: '#10b981' },
    VERIFIED: { text: 'Verified', color: '#38bdf8' },
    PENDING: { text: 'Pending', color: '#5a7499' },
  };
  const c = map[status] ?? { text: status, color: '#5a7499' };
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold" style={{ color: c.color }}>
      <span className="size-1.5 rounded-full animate-blink" style={{ background: c.color }} aria-hidden="true" />
      {c.text}
    </span>
  );
}

export default function HospitalDashboard({ onNavigate }: Props) {
  const [requests, setRequests] = useState<BloodRequest[]>(mockRequests);
  const [selectedReq, setSelectedReq] = useState<BloodRequest | null>(requests[0]);
  const [showCreate, setShowCreate] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState(mockNotifications);
  const [activeTab, setActiveTab] = useState<'timeline' | 'donors' | 'network'>('timeline');

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleCreateRequest = (data: { bloodGroup: BloodGroup; units: number; urgency: Urgency }) => {
    const newReq: BloodRequest = {
      id: `req${Date.now()}`,
      bloodGroup: data.bloodGroup,
      unitsRequired: data.units,
      urgency: data.urgency,
      status: 'CHECKING_BLOOD_BANK',
      hospital: 'Apollo Hospitals, Chennai',
      createdAt: new Date().toISOString(),
      bloodBankUnits: 0,
      donorUnits: 0,
      timeline: [
        { event: 'Request Created', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), completed: true },
        { event: 'Hospital Verification', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), completed: true },
        { event: 'Scanning Blood Banks', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), completed: false, active: true },
        { event: 'Fulfillment', time: '—', completed: false },
      ],
    };
    setRequests(prev => [newReq, ...prev]);
    setSelectedReq(newReq);
    setShowCreate(false);
  };

  const notifColors: Record<string, string> = {
    CRITICAL: '#c01832', URGENT: '#f59e0b', INFO: '#38bdf8', SUCCESS: '#10b981',
  };

  return (
    <div
      className="h-screen flex flex-col text-bb-text overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.88), rgba(255,255,255,0.88)), url('/hospital-bg.png')",
      }}
    >
      {/* Top nav */}
      <header className="glass border-b border-bb-border shrink-0 z-30">
        <div className="flex items-center justify-between px-4 sm:px-6 h-14">
          <div className="flex items-center gap-3">
            <button onClick={() => onNavigate('role-select')} className="size-8 rounded-lg border border-bb-border flex items-center justify-center text-bb-muted hover:text-bb-text transition-colors" aria-label="Back to role select">
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div>
              <p className="font-bold text-sm text-bb-text">Hospital Command Center</p>
              <p className="font-mono text-xs text-bb-muted">Apollo Hospitals · Chennai</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Live indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full border border-bb-teal/30 bg-bb-teal/10">
              <span className="size-1.5 rounded-full bg-bb-teal animate-blink" aria-hidden="true" />
              <span className="font-mono text-xs text-bb-teal font-bold">LIVE</span>
            </div>

            {/* Notification bell */}
            <button
              onClick={() => setShowNotif(!showNotif)}
              className="relative size-9 rounded-lg border border-bb-border flex items-center justify-center text-bb-muted hover:text-bb-text transition-colors"
              aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
            >
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 size-4 rounded-full bg-bb-crimson text-white text-xs flex items-center justify-center font-bold">{unreadCount}</span>
              )}
            </button>

            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bb-crimson border border-bb-crimson text-white text-sm font-bold hover:bg-bb-crimson-bright transition-colors"
            >
              <span aria-hidden="true">+</span>
              <span className="hidden sm:block">New Request</span>
            </button>
          </div>
        </div>
      </header>

      {/* Metric strip */}
      <div className="glass border-b border-bb-border shrink-0">
        <div className="flex overflow-x-auto divide-x divide-bb-border">
          {[
            { value: requests.length, label: 'Active Requests', color: '#c01832', icon: '🔴' },
            { value: requests.reduce((s, r) => s + r.unitsRequired, 0), label: 'Units in Motion', color: '#f59e0b', icon: '↑' },
            { value: 8, label: 'Banks Connected', color: '#00bfb3', icon: '🏦' },
            { value: 126, label: 'Donors Nearby', color: '#818cf8', icon: '🩸' },
          ].map((m) => (
            <div key={m.label} className="flex items-center gap-2.5 px-5 py-3 min-w-max">
              <span className="text-sm" aria-hidden="true">{m.icon}</span>
              <div>
                <p className="font-mono font-bold text-lg leading-none" style={{ color: m.color }}>{m.value}</p>
                <p className="text-xs text-bb-muted mt-0.5">{m.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main grid */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Request list */}
        <aside className="w-64 xl:w-72 border-r border-bb-border flex flex-col overflow-hidden shrink-0 hidden md:flex">
          <div className="p-3 border-b border-bb-border">
            <p className="font-mono text-xs uppercase tracking-widest text-bb-muted">Active Requests</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {requests.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-center px-4">
                <p className="text-bb-muted text-sm font-semibold">Network clear</p>
                <p className="text-bb-muted/60 text-xs mt-1">New requests will appear here.</p>
              </div>
            )}
            {requests.map((req) => (
              <button
                key={req.id}
                onClick={() => setSelectedReq(req)}
                className={`w-full text-left rounded-xl p-3 transition-all border ${selectedReq?.id === req.id ? 'bg-bb-panel border-bb-border-light' : 'border-transparent hover:bg-bb-surface hover:border-bb-border'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <BloodGroupBadge group={req.bloodGroup} size="sm" />
                  <UrgencyBadge urgency={req.urgency} size="sm" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-bb-text">{req.unitsRequired} units</span>
                  <StatusLabel status={req.status} />
                </div>
                {/* Fulfillment progress */}
                {req.bloodBankUnits > 0 && (
                  <div className="mt-2 progress-bar">
                    <div
                      className="progress-fill bg-bb-teal"
                      style={{ width: `${(req.bloodBankUnits / req.unitsRequired) * 100}%` }}
                      aria-label={`${req.bloodBankUnits} of ${req.unitsRequired} units found`}
                    />
                  </div>
                )}
              </button>
            ))}
          </div>
        </aside>

        {/* Detail panel */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          {selectedReq ? (
            <>
              {/* Request header */}
              <div className="glass-light border-b border-bb-border p-4 sm:p-5 shrink-0">
                <div className="flex flex-wrap items-start gap-4 justify-between">
                  <div className="flex items-center gap-3">
                    <BloodGroupBadge group={selectedReq.bloodGroup} size="lg" />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-2xl font-bold text-bb-text">{selectedReq.unitsRequired} units</span>
                        <UrgencyBadge urgency={selectedReq.urgency} size="md" />
                      </div>
                      <p className="text-xs text-bb-muted mt-0.5 font-mono">{selectedReq.hospital}</p>
                    </div>
                  </div>
                  <StatusLabel status={selectedReq.status} />
                </div>

                {/* Fulfillment breakdown */}
                <div className="mt-4 grid sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-bb-border bg-bb-surface p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-bb-teal font-semibold">Blood Bank Contribution</span>
                      <span className="font-mono text-sm font-bold text-bb-teal">{selectedReq.bloodBankUnits}/{selectedReq.unitsRequired}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill bg-bb-teal" style={{ width: `${selectedReq.unitsRequired > 0 ? (selectedReq.bloodBankUnits / selectedReq.unitsRequired) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <div className="rounded-xl border border-bb-border bg-bb-surface p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-bb-indigo font-semibold">Donor Network</span>
                      <span className="font-mono text-sm font-bold text-bb-indigo">{selectedReq.donorUnits} needed</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill bg-bb-indigo" style={{ width: selectedReq.donorUnits > 0 ? `${(selectedReq.donorUnits / selectedReq.unitsRequired) * 100}%` : '0%' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-bb-border shrink-0">
                {(['timeline', 'donors', 'network'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-5 py-3 text-xs font-semibold uppercase tracking-widest transition-colors border-b-2 ${activeTab === tab ? 'border-bb-crimson text-bb-crimson-bright' : 'border-transparent text-bb-muted hover:text-bb-dim'}`}
                  >
                    {tab === 'timeline' ? 'Journey' : tab === 'donors' ? `Donors (${selectedReq.donors?.length ?? 0})` : 'Network View'}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                {activeTab === 'timeline' && (
                  <div className="max-w-sm">
                    <RequestTimeline events={selectedReq.timeline} />
                  </div>
                )}

                {activeTab === 'donors' && (
                  <div className="space-y-3 max-w-xl">
                    {(selectedReq.donors?.length ?? 0) === 0 ? (
                      <div className="text-center py-10">
                        <p className="text-bb-muted text-sm">No donor matches yet for this request.</p>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-bb-muted font-mono uppercase tracking-widest mb-4">Compatibility & Response Matrix</p>
                        {selectedReq.donors!.map(d => (
                          <DonorMatchCard
                            key={d.id}
                            donor={d}
                            viewMode="hospital"
                            onAccept={() => { }}
                            onDecline={() => { }}
                          />
                        ))}
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'network' && (
                  <div className="flex items-center justify-center min-h-48">
                    <BloodFlowNetwork variant="compact" requestStatus={selectedReq.status} />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <BloodFlowNetwork variant="compact" />
              <p className="font-semibold text-bb-text mt-6">The network is currently clear.</p>
              <p className="text-bb-muted text-sm mt-2">New verified requests will appear here when created.</p>
              <button onClick={() => setShowCreate(true)} className="mt-6 px-5 py-2.5 rounded-xl bg-bb-crimson/15 border border-bb-crimson/40 text-bb-crimson-bright text-sm font-semibold hover:bg-bb-crimson/25 transition-all">
                Create First Request
              </button>
            </div>
          )}
        </main>

        {/* Notification panel */}
        {showNotif && (
          <aside className="w-72 border-l border-bb-border flex flex-col overflow-hidden shrink-0 animate-slide-in-right absolute right-0 top-14 bottom-0 z-20 glass">
            <div className="flex items-center justify-between p-4 border-b border-bb-border">
              <p className="font-semibold text-sm text-bb-text">Notifications</p>
              <button onClick={() => setShowNotif(false)} className="text-bb-muted hover:text-bb-text transition-colors" aria-label="Close notifications">
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {notifications.map(n => (
                <div
                  key={n.id}
                  className={`rounded-xl p-3 border transition-all cursor-pointer ${n.read ? 'border-bb-border bg-bb-surface/40' : 'border-bb-border-light bg-bb-panel'}`}
                  onClick={() => setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="size-2 rounded-full mt-1.5 shrink-0 animate-blink" style={{ background: notifColors[n.type], animationPlayState: n.read ? 'paused' : 'running' }} aria-hidden="true" />
                    <div>
                      <p className="text-xs font-bold text-bb-text">{n.title}</p>
                      <p className="text-xs text-bb-muted mt-0.5">{n.message}</p>
                      <p className="font-mono text-xs text-bb-muted/60 mt-1">{n.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>

      {showCreate && (
        <CreateRequestFlow
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreateRequest}
        />
      )}
    </div>
  );
}
