import { useState } from 'react';
import type { DonorAvailability, Page } from '../types';
import { mockDonors } from '../data/mock';
import UrgencyBadge from '../components/UrgencyBadge';

interface Props {
  onNavigate: (page: Page) => void;
}

type Tab = 'overview' | 'history' | 'requirements';

type AvailabilityOption = {
  key: DonorAvailability;
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: string;
  desc: string;
};

const availabilityOptions: AvailabilityOption[] = [
  { key: 'AVAILABLE', label: 'Available', color: '#00bfb3', bg: 'rgba(0,191,179,0.10)', border: 'rgba(0,191,179,0.35)', icon: '●', desc: 'Ready to respond to requests' },
  { key: 'BUSY', label: 'Busy', color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.35)', icon: '◐', desc: 'May not respond immediately' },
  { key: 'UNAVAILABLE', label: 'Unavailable', color: '#94a3b8', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.35)', icon: '○', desc: 'Will not receive requests' },
];

const donorHistory = [
  { date: 'Feb 15, 2024', hospital: 'Apollo Hospitals', city: 'Chennai', group: 'O+', units: 1, status: 'Completed' },
  { date: 'Oct 8, 2023', hospital: 'Fortis Hospital', city: 'Mumbai', group: 'O+', units: 1, status: 'Completed' },
  { date: 'Apr 2, 2023', hospital: 'AIIMS Delhi', city: 'Delhi', group: 'O+', units: 1, status: 'Completed' },
  { date: 'Nov 20, 2022', hospital: 'Chennai Blood Centre', city: 'Chennai', group: 'O+', units: 1, status: 'Completed' },
  { date: 'May 5, 2022', hospital: 'LifeSource Blood Bank', city: 'Chennai', group: 'O+', units: 1, status: 'Completed' },
];

const requirementCategories = [
  {
    title: 'Basic Eligibility',
    icon: '✅',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.25)',
    rules: [
      { label: 'Age', detail: 'Must be between 18 and 65 years old.' },
      { label: 'Weight', detail: 'Minimum body weight of 50 kg (110 lbs).' },
      { label: 'Pulse', detail: 'Regular pulse rate between 50–100 beats per minute.' },
      { label: 'Blood Pressure', detail: 'Systolic 100–180 mmHg and diastolic 50–100 mmHg.' },
      { label: 'Temperature', detail: 'Oral temperature must not exceed 37.5°C (99.5°F).' },
      { label: 'Hemoglobin', detail: 'Minimum 12.5 g/dL for females, 13.0 g/dL for males.' },
    ],
  },
  {
    title: 'Donation Interval',
    icon: '📅',
    color: '#818cf8',
    bg: 'rgba(129,140,248,0.08)',
    border: 'rgba(129,140,248,0.25)',
    rules: [
      { label: 'Whole Blood', detail: 'At least 90 days (3 months) since your last whole blood donation.' },
      { label: 'Platelets', detail: 'At least 7 days since last platelet donation; maximum 24 times per year.' },
      { label: 'Plasma', detail: 'At least 28 days since your last plasma donation.' },
      { label: 'Double Red Cells', detail: 'At least 112 days between double red cell donations.' },
    ],
  },
  {
    title: 'Health & Lifestyle',
    icon: '🏥',
    color: '#38bdf8',
    bg: 'rgba(56,189,248,0.08)',
    border: 'rgba(56,189,248,0.25)',
    rules: [
      { label: 'No Active Illness', detail: 'Must be free of cold, flu, fever, or active infection on the day of donation.' },
      { label: 'Chronic Conditions', detail: 'Donors with controlled hypertension or diabetes may still be eligible — consult the screening team.' },
      { label: 'Pregnancy', detail: 'Not eligible during pregnancy or for 6 months after delivery.' },
      { label: 'Breastfeeding', detail: 'Wait until 3 months after breastfeeding has ended.' },
      { label: 'Recent Surgery', detail: 'Wait 6–12 months after major surgery, depending on the procedure.' },
      { label: 'Dental Work', detail: 'Wait 24 hours after a simple filling; 1 month after oral surgery.' },
    ],
  },
  {
    title: 'Medications & Substances',
    icon: '💊',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.25)',
    rules: [
      { label: 'Antibiotics', detail: 'Wait 14 days after completing a course of antibiotics.' },
      { label: 'Aspirin', detail: 'Wait 48 hours if donating platelets; no waiting period for whole blood.' },
      { label: 'Blood Thinners', detail: 'Not eligible while on anticoagulants such as warfarin or rivaroxaban.' },
      { label: 'Alcohol', detail: 'Avoid alcohol for at least 24 hours before donation.' },
      { label: 'Vaccinations', detail: 'Most vaccines require a waiting period of 14–28 days. Flu vaccine: 24 hours.' },
      { label: 'Acutane / Isotretinoin', detail: 'Wait 1 month after last dose.' },
    ],
  },
  {
    title: 'Travel & Tattoos',
    icon: '✈️',
    color: '#c01832',
    bg: 'rgba(192,24,50,0.08)',
    border: 'rgba(192,24,50,0.25)',
    rules: [
      { label: 'Tattoos', detail: 'Wait 6 months after getting a tattoo in a non-regulated facility; 3 months for regulated studios.' },
      { label: 'Piercings', detail: 'Wait 6 months after body piercing with shared or non-sterile equipment.' },
      { label: 'International Travel', detail: 'Travel to malaria-risk areas requires a 3-month deferral after return.' },
      { label: 'Needle Use', detail: 'Intravenous drug users and those with needlestick exposures are indefinitely deferred.' },
    ],
  },
];

const incomingRequest = {
  bloodGroup: 'O+' as const,
  urgency: 'CRITICAL' as const,
  hospital: 'Apollo Hospitals',
  distance: 4.2,
  matchScore: 94,
  postedAt: '10:47 AM',
};

const donor = mockDonors[0];

export default function DonorDashboard({ onNavigate }: Props) {
  const [tab, setTab] = useState<Tab>('overview');
  const [availability, setAvailability] = useState<DonorAvailability>('AVAILABLE');
  const [showAvailMenu, setShowAvailMenu] = useState(false);
  const [requestResponse, setRequestResponse] = useState<'pending' | 'accepted' | 'declined'>('pending');
  const [showRequest, setShowRequest] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [openCategory, setOpenCategory] = useState<string | null>('Basic Eligibility');

  const currentAvail = availabilityOptions.find(o => o.key === availability)!;

  const handleAccept = () => {
    setRequestResponse('accepted');
    setShowRequest(false);
    setToast('✓ Response recorded. The hospital has been notified.');
    setTimeout(() => setToast(null), 4000);
  };

  const handleDecline = () => {
    setRequestResponse('declined');
    setShowRequest(false);
    setToast('Response recorded. Thank you.');
    setTimeout(() => setToast(null), 3000);
  };

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: '🩸' },
    { key: 'history', label: 'Donation History', icon: '📋' },
    { key: 'requirements', label: 'Requirements', icon: '📋' },
  ];

  return (
    <div className="min-h-screen bg-bb-bg text-bb-text flex flex-col">
      {/* Header */}
      <header className="glass border-b border-bb-border sticky top-0 z-30">
        <div className="flex items-center justify-between px-4 sm:px-6 h-14">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('role-select')}
              className="size-8 rounded-lg border border-bb-border flex items-center justify-center text-bb-muted hover:text-bb-text transition-colors"
              aria-label="Back to role select"
            >
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <span className="size-7 rounded-lg bg-bb-crimson/10 border border-bb-crimson/30 flex items-center justify-center text-sm" aria-hidden="true">🩸</span>
              <span className="font-bold text-bb-text tracking-tight">Blood<span className="text-bb-crimson">Bridge</span></span>
            </div>
          </div>

          {/* Tab navigation in header */}
          <nav className="hidden sm:flex items-center gap-1" role="tablist" aria-label="Donor sections">
            {tabs.map(t => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  tab === t.key
                    ? 'bg-bb-crimson/10 text-bb-crimson border border-bb-crimson/25 font-semibold'
                    : 'text-bb-muted hover:text-bb-text hover:bg-bb-surface'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {/* Availability pill */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full border cursor-pointer select-none"
            style={{ background: currentAvail.bg, borderColor: currentAvail.border }}
            onClick={() => setShowAvailMenu(!showAvailMenu)}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && setShowAvailMenu(!showAvailMenu)}
            aria-label={`Status: ${currentAvail.label}. Click to change.`}
          >
            <span className="size-2 rounded-full animate-blink" style={{ background: currentAvail.color }} aria-hidden="true" />
            <span className="font-mono text-xs font-bold" style={{ color: currentAvail.color }}>{currentAvail.label.toUpperCase()}</span>
          </div>

          {/* Donor name */}
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-bb-indigo/10 border border-bb-indigo/30 flex items-center justify-center font-bold text-bb-indigo text-xs">
              {donor.name.split(' ').map(n => n[0]).join('')}
            </div>
            <span className="hidden md:block text-sm font-medium text-bb-text">{donor.name}</span>
          </div>
        </div>

        {/* Mobile tab bar */}
        <div className="sm:hidden flex border-t border-bb-border" role="tablist" aria-label="Donor sections">
          {tabs.map(t => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 text-xs font-medium border-b-2 transition-all ${
                tab === t.key ? 'border-bb-crimson text-bb-crimson' : 'border-transparent text-bb-muted'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* Availability dropdown (portal-style, absolute) */}
      {showAvailMenu && (
        <div className="fixed top-16 right-4 z-50 glass rounded-xl shadow-lg w-56 border border-bb-border overflow-hidden animate-slide-up" role="menu">
          {availabilityOptions.filter(o => o.key !== availability).map(opt => (
            <button
              key={opt.key}
              role="menuitem"
              onClick={() => { setAvailability(opt.key); setShowAvailMenu(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bb-surface transition-colors text-left border-b border-bb-border last:border-0"
            >
              <span className="font-bold text-lg" style={{ color: opt.color }}>{opt.icon}</span>
              <div>
                <p className="text-sm font-semibold text-bb-text">{opt.label}</p>
                <p className="text-xs text-bb-muted">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">

          {/* ─── OVERVIEW TAB ─── */}
          {tab === 'overview' && (
            <>
              <h1 className="text-2xl font-bold text-bb-text">Your Impact</h1>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: '🩸', label: 'Blood Group', value: donor.bloodGroup, color: '#c01832' },
                  { icon: '❤️', label: 'Responses', value: String(donor.responses), color: '#818cf8' },
                  { icon: '📍', label: 'Radius', value: '15 km', color: '#00bfb3' },
                ].map(s => (
                  <div key={s.label} className="rounded-2xl border border-bb-border bg-bb-surface p-4 text-center">
                    <p className="text-2xl mb-1" aria-hidden="true">{s.icon}</p>
                    <p className="font-mono font-bold text-lg" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-xs text-bb-muted mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Availability control */}
              <section className="rounded-2xl border border-bb-border bg-bb-surface p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-bb-text">Availability Status</h2>
                  <button
                    onClick={() => setShowAvailMenu(!showAvailMenu)}
                    className="text-xs font-mono text-bb-muted hover:text-bb-text transition-colors border border-bb-border rounded-lg px-2.5 py-1 hover:border-bb-border-light bg-white"
                  >
                    Change
                  </button>
                </div>
                <div
                  className="flex items-center gap-4 p-4 rounded-xl transition-all"
                  style={{ background: currentAvail.bg, border: `1px solid ${currentAvail.border}` }}
                >
                  <div
                    className="size-14 rounded-full flex items-center justify-center text-2xl font-bold"
                    style={{ background: `${currentAvail.color}15`, border: `2px solid ${currentAvail.color}` }}
                    aria-hidden="true"
                  >
                    <span className="animate-blink" style={{ color: currentAvail.color }}>{currentAvail.icon}</span>
                  </div>
                  <div>
                    <p className="font-bold text-lg" style={{ color: currentAvail.color }}>{currentAvail.label}</p>
                    <p className="text-sm text-bb-muted">{currentAvail.desc}</p>
                  </div>
                </div>
              </section>

              {/* Incoming request alert */}
              {showRequest && availability === 'AVAILABLE' && requestResponse === 'pending' && (
                <section
                  className="rounded-2xl p-5 border animate-slide-up"
                  style={{ borderColor: 'rgba(192,24,50,0.35)', background: 'rgba(192,24,50,0.04)' }}
                  role="alert"
                  aria-live="assertive"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <span className="size-2 rounded-full bg-bb-crimson animate-blink" aria-hidden="true" />
                    <p className="font-mono text-xs font-bold tracking-widest text-bb-crimson uppercase">Verified Hospital Request</p>
                  </div>

                  <div className="flex items-start gap-4 mb-4">
                    <div className="size-14 rounded-2xl flex items-center justify-center font-mono font-bold text-bb-crimson text-sm shrink-0" style={{ background: 'rgba(192,24,50,0.10)', border: '1px solid rgba(192,24,50,0.30)' }}>
                      {incomingRequest.bloodGroup}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-bb-text">Blood Required</span>
                        <UrgencyBadge urgency={incomingRequest.urgency} />
                      </div>
                      <p className="text-sm text-bb-muted">{incomingRequest.hospital}</p>
                      <div className="flex gap-4 font-mono text-xs text-bb-muted">
                        <span>📍 {incomingRequest.distance} km away</span>
                        <span>🕐 {incomingRequest.postedAt}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border p-3 mb-4" style={{ background: 'rgba(129,140,248,0.08)', borderColor: 'rgba(129,140,248,0.25)' }}>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-bb-indigo font-semibold">Your Match Score</p>
                      <p className="font-mono font-bold text-bb-indigo text-xl">{incomingRequest.matchScore}%</p>
                    </div>
                    <div className="mt-2 progress-bar">
                      <div className="progress-fill bg-bb-indigo" style={{ width: `${incomingRequest.matchScore}%` }} />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleAccept}
                      className="flex-1 py-3 rounded-xl font-bold text-sm transition-colors"
                      style={{ background: 'rgba(0,191,179,0.12)', border: '1px solid rgba(0,191,179,0.40)', color: '#00bfb3' }}
                    >
                      I Can Help
                    </button>
                    <button
                      onClick={handleDecline}
                      className="flex-1 py-3 rounded-xl border border-bb-border text-bb-muted font-semibold text-sm hover:text-bb-text hover:border-bb-border-light transition-colors bg-white"
                    >
                      Not Available
                    </button>
                  </div>
                </section>
              )}

              {requestResponse === 'accepted' && (
                <div className="rounded-2xl p-5 border text-center animate-slide-up" style={{ borderColor: 'rgba(0,191,179,0.35)', background: 'rgba(0,191,179,0.06)' }}>
                  <div className="size-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(0,191,179,0.15)', border: '1px solid rgba(0,191,179,0.40)' }}>
                    <svg className="size-6 text-bb-teal" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  </div>
                  <p className="font-bold text-bb-teal">Response Recorded</p>
                  <p className="text-sm text-bb-muted mt-1">Apollo Hospitals has been notified of your response.</p>
                </div>
              )}

              {/* Next eligibility */}
              <section className="rounded-2xl border p-5" style={{ borderColor: 'rgba(245,158,11,0.30)', background: 'rgba(245,158,11,0.05)' }}>
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl flex items-center justify-center text-bb-amber" style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.30)' }}>
                    📅
                  </div>
                  <div>
                    <p className="font-semibold text-bb-text">Next Eligible to Donate</p>
                    <p className="font-mono text-xs text-bb-amber mt-0.5">August 15, 2024 · 90-day interval</p>
                  </div>
                  <button
                    onClick={() => setTab('requirements')}
                    className="ml-auto text-xs text-bb-muted hover:text-bb-text transition-colors underline underline-offset-2"
                  >
                    View rules
                  </button>
                </div>
              </section>
            </>
          )}

          {/* ─── DONATION HISTORY TAB ─── */}
          {tab === 'history' && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-bb-text">Donation History</h1>
                  <p className="text-sm text-bb-muted mt-0.5">{donorHistory.length} donations recorded</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-2xl font-bold text-bb-crimson">{donorHistory.length}</p>
                  <p className="text-xs text-bb-muted">Total Donations</p>
                </div>
              </div>

              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'This Year', value: '2', color: '#00bfb3' },
                  { label: 'Last Year', value: '2', color: '#818cf8' },
                  { label: 'All Time', value: String(donorHistory.length), color: '#c01832' },
                ].map(s => (
                  <div key={s.label} className="rounded-xl border border-bb-border bg-bb-surface p-3 text-center">
                    <p className="font-mono font-bold text-xl" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-xs text-bb-muted mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* History list */}
              <div className="rounded-2xl border border-bb-border bg-white overflow-hidden">
                {donorHistory.map((d, i) => (
                  <div key={i} className={`flex items-center gap-4 px-5 py-4 ${i < donorHistory.length - 1 ? 'border-b border-bb-border' : ''}`}>
                    <div className="size-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.30)' }}>
                      <svg className="size-5 text-bb-green" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-bb-text text-sm truncate">{d.hospital}</p>
                      <p className="text-xs text-bb-muted">{d.city} · {d.date}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-block font-mono text-xs font-bold text-bb-crimson bg-bb-crimson/10 border border-bb-crimson/25 rounded-full px-2 py-0.5">{d.group}</span>
                      <p className="text-xs text-bb-green mt-1">{d.status}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="rounded-2xl border border-bb-border bg-bb-surface p-5 text-center">
                <p className="text-sm text-bb-muted">Ready to donate again?</p>
                <p className="font-mono text-xs text-bb-amber mt-1">Next eligible: August 15, 2024</p>
                <button
                  onClick={() => setTab('overview')}
                  className="mt-3 px-5 py-2 rounded-xl text-sm font-semibold transition-colors"
                  style={{ background: 'rgba(192,24,50,0.10)', border: '1px solid rgba(192,24,50,0.30)', color: '#c01832' }}
                >
                  View Incoming Requests
                </button>
              </div>
            </>
          )}

          {/* ─── REQUIREMENTS TAB ─── */}
          {tab === 'requirements' && (
            <>
              <div>
                <h1 className="text-2xl font-bold text-bb-text">Donation Requirements</h1>
                <p className="text-sm text-bb-muted mt-1">Review these eligibility criteria before each donation. Requirements may vary slightly by location.</p>
              </div>

              {/* Quick checklist */}
              <div className="rounded-2xl border border-bb-border bg-bb-surface p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-bb-muted mb-3">Quick Eligibility Checklist</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {[
                    'Age 18–65 years',
                    'Weight ≥ 50 kg',
                    'No active illness today',
                    'Last donation ≥ 90 days ago',
                    'Not pregnant or breastfeeding',
                    'No antibiotics in last 14 days',
                    'No tattoo in last 6 months',
                    'Hemoglobin within normal range',
                  ].map(item => (
                    <div key={item} className="flex items-center gap-2 text-sm text-bb-dim">
                      <svg className="size-4 text-bb-green shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Detailed categories — accordion */}
              <div className="space-y-3">
                {requirementCategories.map(cat => {
                  const isOpen = openCategory === cat.title;
                  return (
                    <div
                      key={cat.title}
                      className="rounded-2xl border overflow-hidden transition-all"
                      style={{ borderColor: isOpen ? cat.border : '#e2e8f0' }}
                    >
                      <button
                        onClick={() => setOpenCategory(isOpen ? null : cat.title)}
                        className="w-full flex items-center gap-3 px-5 py-4 text-left"
                        style={{ background: isOpen ? cat.bg : 'white' }}
                        aria-expanded={isOpen}
                      >
                        <span className="text-xl shrink-0" aria-hidden="true">{cat.icon}</span>
                        <span className="flex-1 font-semibold text-bb-text">{cat.title}</span>
                        <span className="font-mono text-xs text-bb-muted shrink-0">{cat.rules.length} rules</span>
                        <svg
                          className="size-4 text-bb-muted shrink-0 transition-transform"
                          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {isOpen && (
                        <div className="border-t px-5 pb-4 pt-3 space-y-3 animate-slide-up bg-white" style={{ borderColor: cat.border }}>
                          {cat.rules.map(rule => (
                            <div key={rule.label} className="flex gap-3">
                              <div
                                className="mt-0.5 size-5 rounded-full shrink-0 flex items-center justify-center"
                                style={{ background: cat.bg, border: `1px solid ${cat.border}` }}
                                aria-hidden="true"
                              >
                                <span className="size-1.5 rounded-full" style={{ background: cat.color }} />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-bb-text">{rule.label}</p>
                                <p className="text-xs text-bb-muted leading-relaxed mt-0.5">{rule.detail}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Disclaimer */}
              <div className="rounded-xl border border-bb-border bg-bb-surface p-4">
                <p className="text-xs text-bb-muted leading-relaxed">
                  <strong className="text-bb-dim">Disclaimer:</strong> These are general guidelines. Final eligibility is determined by a qualified medical professional during the donation screening process. Always consult your local blood bank or hospital for location-specific requirements.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl px-5 py-3 text-sm font-semibold animate-slide-up shadow-lg border"
          style={{ background: 'white', borderColor: 'rgba(0,191,179,0.40)', color: '#00bfb3' }}
          role="status"
          aria-live="polite"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
