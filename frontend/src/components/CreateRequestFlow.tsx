import { useState } from 'react';
import type { BloodGroup, Urgency } from '../types';
import BloodGroupBadge from './BloodGroupBadge';
import UrgencyBadge from './UrgencyBadge';

interface Props {
  onClose: () => void;
  onSubmit: (data: { bloodGroup: BloodGroup; units: number; urgency: Urgency }) => void;
}

const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const URGENCIES: Urgency[] = ['NORMAL', 'URGENT', 'CRITICAL'];

type Step = 1 | 2 | 3 | 4;

export default function CreateRequestFlow({ onClose, onSubmit }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('O+');
  const [units, setUnits] = useState(1);
  const [urgency, setUrgency] = useState<Urgency>('URGENT');
  const [verified, setVerified] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);

  const processingSteps = [
    'Verifying request...',
    'Scanning nearby blood banks...',
    'Analyzing available inventory...',
    'Activating BloodBridge Network',
  ];

  const handleActivate = async () => {
    setProcessing(true);
    for (let i = 0; i < processingSteps.length; i++) {
      setProcessingStep(i);
      await new Promise(r => setTimeout(r, 900));
    }
    onSubmit({ bloodGroup, units, urgency });
  };

  const stepLabels = ['Patient Requirement', 'Verification', 'Location', 'Review'];

  if (processing) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-bb-bg/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Processing request">
        <div className="glass rounded-2xl p-10 w-full max-w-sm text-center space-y-6 animate-slide-up">
          <div className="flex justify-center">
            <div className="relative size-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-bb-crimson/30 animate-ping" />
              <div className="size-10 rounded-full bg-bb-crimson/15 border border-bb-crimson/50 flex items-center justify-center">
                <svg className="size-5 text-bb-crimson-bright animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            {processingSteps.map((s, i) => (
              <div key={i} className={`flex items-center gap-3 transition-all duration-300 ${i > processingStep ? 'opacity-25' : 'opacity-100'}`}>
                <div className={`size-5 rounded-full border flex items-center justify-center shrink-0 ${i < processingStep ? 'border-bb-teal bg-bb-teal/20' : i === processingStep ? 'border-bb-indigo bg-bb-indigo/20' : 'border-bb-border'}`}>
                  {i < processingStep && (
                    <svg className="size-3 text-bb-teal" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  )}
                  {i === processingStep && <span className="size-2 rounded-full bg-bb-indigo animate-blink" aria-hidden="true" />}
                </div>
                <span className={`text-sm ${i === processingStep ? 'text-bb-text' : i < processingStep ? 'text-bb-teal' : 'text-bb-muted'}`}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-bb-bg/80 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
      <div className="glass rounded-2xl w-full max-w-lg animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-bb-border">
          <div>
            <h2 className="font-bold text-bb-text">New Blood Request</h2>
            <p className="text-xs text-bb-muted mt-0.5">Step {step} of 4 — {stepLabels[step - 1]}</p>
          </div>
          <button onClick={onClose} className="size-8 rounded-lg bg-bb-surface border border-bb-border flex items-center justify-center text-bb-muted hover:text-bb-text transition-colors" aria-label="Close">
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-bb-border">
          <div className="h-full bg-bb-crimson transition-all duration-300" style={{ width: `${(step / 4) * 100}%` }} aria-hidden="true" />
        </div>

        <div className="p-5 space-y-5">
          {step === 1 && (
            <div className="space-y-4 animate-slide-up">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-bb-muted mb-2">Blood Group</label>
                <div className="grid grid-cols-4 gap-2">
                  {BLOOD_GROUPS.map(g => (
                    <button
                      key={g}
                      onClick={() => setBloodGroup(g)}
                      className={`py-2.5 rounded-xl font-mono font-bold text-sm transition-all border ${bloodGroup === g ? 'bg-bb-crimson/20 border-bb-crimson text-bb-crimson-bright' : 'border-bb-border text-bb-muted hover:border-bb-border-light hover:text-bb-dim'}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-bb-muted mb-2">Units Required</label>
                <div className="flex items-center gap-4">
                  <button onClick={() => setUnits(Math.max(1, units - 1))} className="size-10 rounded-xl border border-bb-border flex items-center justify-center text-bb-text hover:border-bb-border-light font-bold text-lg transition-colors" aria-label="Decrease units">−</button>
                  <span className="font-mono text-3xl font-bold text-bb-text w-12 text-center">{units}</span>
                  <button onClick={() => setUnits(Math.min(20, units + 1))} className="size-10 rounded-xl border border-bb-border flex items-center justify-center text-bb-text hover:border-bb-border-light font-bold text-lg transition-colors" aria-label="Increase units">+</button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-bb-muted mb-2">Urgency Level</label>
                <div className="flex gap-2">
                  {URGENCIES.map(u => (
                    <button key={u} onClick={() => setUrgency(u)} className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all ${urgency === u ? 'border-bb-border-light bg-bb-panel' : 'border-bb-border bg-transparent hover:border-bb-border-light'}`}>
                      <UrgencyBadge urgency={u} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-slide-up">
              <p className="text-sm text-bb-dim">A verified hospital staff member must confirm patient requirement before activating the BloodBridge network.</p>
              <button
                onClick={() => setVerified(!verified)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${verified ? 'border-bb-teal/50 bg-bb-teal/10' : 'border-bb-border bg-bb-surface'}`}
                aria-pressed={verified}
              >
                <div className={`size-6 rounded border-2 flex items-center justify-center transition-all ${verified ? 'border-bb-teal bg-bb-teal' : 'border-bb-border'}`}>
                  {verified && <svg className="size-4 text-bb-bg" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                </div>
                <span className={`text-sm font-medium ${verified ? 'text-bb-teal-bright' : 'text-bb-muted'}`}>Patient requirement verified by hospital staff</span>
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3 animate-slide-up">
              <p className="text-sm text-bb-dim">Hospital location is used automatically for blood-bank proximity search.</p>
              <div className="p-4 rounded-xl border border-bb-border bg-bb-surface flex items-center gap-3">
                <div className="size-10 rounded-full bg-bb-blue/15 border border-bb-blue/30 flex items-center justify-center text-bb-blue">📍</div>
                <div>
                  <p className="font-semibold text-bb-text text-sm">Apollo Hospitals, Chennai</p>
                  <p className="font-mono text-xs text-bb-muted">13.0827° N, 80.2707° E</p>
                </div>
                <span className="ml-auto text-xs text-bb-teal font-semibold border border-bb-teal/30 rounded px-2 py-0.5 bg-bb-teal/10">AUTO</span>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 animate-slide-up">
              <div className="p-4 rounded-xl border border-bb-border bg-bb-surface space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-bb-muted">Request Summary</p>
                <div className="flex items-center gap-3">
                  <BloodGroupBadge group={bloodGroup} size="lg" />
                  <div>
                    <p className="font-mono text-2xl font-bold text-bb-text">{units} <span className="text-sm text-bb-muted">units</span></p>
                    <UrgencyBadge urgency={urgency} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-bb-muted font-mono">
                  <span>Hospital: <span className="text-bb-text">Apollo Hospitals</span></span>
                  <span>City: <span className="text-bb-text">Chennai</span></span>
                </div>
              </div>
              <p className="text-xs text-bb-muted">Activating the network will scan all nearby verified blood banks and begin intelligent donor matching if needed.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-bb-border">
          <button
            onClick={() => step > 1 ? setStep((step - 1) as Step) : onClose()}
            className="px-4 py-2 rounded-xl border border-bb-border text-sm text-bb-muted hover:text-bb-text hover:border-bb-border-light transition-colors"
          >
            {step === 1 ? 'Cancel' : '← Back'}
          </button>
          {step < 4 ? (
            <button
              onClick={() => setStep((step + 1) as Step)}
              disabled={step === 2 && !verified}
              className="px-5 py-2 rounded-xl bg-bb-crimson/15 border border-bb-crimson/40 text-bb-crimson-bright text-sm font-semibold hover:bg-bb-crimson/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={handleActivate}
              className="px-5 py-2 rounded-xl bg-bb-crimson border border-bb-crimson text-white text-sm font-bold hover:bg-bb-crimson-bright transition-colors glow-crimson"
            >
              Activate BloodBridge Network
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
