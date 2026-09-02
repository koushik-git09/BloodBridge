import { useState } from 'react';
import type { Page } from '../types';

interface Props {
  onNavigate: (page: Page) => void;
}

const roles = [
  {
    id: 'hospital' as Page,
    icon: '🏥',
    title: 'Hospital',
    subtitle: 'Command Center',
    desc: 'Create verified blood requests and coordinate fulfillment across the network.',
    features: ['Create blood requests', 'Monitor fulfillment live', 'View donor matches'],
    color: '#2563EB',
    cardBg: '#EFF6FF',
    hoverBg: '#DBEAFE',
    border: '#BFDBFE',
  },

  {
    id: 'blood-bank' as Page,
    icon: '🏦',
    title: 'Blood Bank',
    subtitle: 'Operations Center',
    desc: 'Manage blood inventory and respond to verified hospital requirements instantly.',
    features: ['Manage inventory', 'Respond to requests', 'Track reservations'],
    color: '#059669',
    cardBg: '#ECFDF5',
    hoverBg: '#D1FAE5',
    border: '#A7F3D0',
  },

  {
    id: 'donor' as Page,
    icon: '🩸',
    title: 'Donor',
    subtitle: 'Network Member',
    desc: 'Join the verified donor network and respond when your blood can help save a life.',
    features: ['Control availability', 'Receive match alerts', 'Track your impact'],
    color: '#DC2626',
    cardBg: '#FFF1F2',
    hoverBg: '#FFE4E6',
    border: '#FECDD3',
  },
];

export default function RoleSelectorPage({ onNavigate }: Props) {
  const [hovered, setHovered] = useState<Page | null>(null);

  return (
    <div className="min-h-screen bb-network-bg flex flex-col">
      {/* Nav */}
      <nav className="glass border-b border-bb-border px-4 sm:px-6 h-14 flex items-center justify-between shrink-0">
        <button
          onClick={() => onNavigate('landing')}
          className="flex items-center gap-2 text-bb-muted hover:text-bb-text transition-colors"
        >
          {/* Back arrow */}
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

          {/* Logo */}
          <img
            src="/bloodbridge-logo.png"
            alt="BloodBridge logo"
            className="size-7 object-contain"
          />

          {/* Brand name */}
          <span className="font-bold">
            Blood<span className="text-bb-crimson-bright">Bridge</span>
          </span>
        </button>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-16">
        {/* BloodBridge network background */}
        <div
          className="fixed inset-0 pointer-events-none overflow-hidden"
          aria-hidden="true"
        >
          {/* Ambient glows */}
          <div className="absolute -top-32 -left-32 size-96 rounded-full bg-bb-crimson/5 blur-3xl" />

          <div className="absolute -bottom-32 -right-32 size-96 rounded-full bg-bb-blue/5 blur-3xl" />

          {/* Network nodes */}
          <span className="bb-node" style={{ left: '12%', top: '22%' }} />
          <span className="bb-node blue" style={{ left: '24%', top: '65%' }} />
          <span className="bb-node teal" style={{ left: '38%', top: '18%' }} />
          <span className="bb-node" style={{ left: '52%', top: '78%' }} />
          <span className="bb-node blue" style={{ left: '68%', top: '25%' }} />
          <span className="bb-node teal" style={{ left: '82%', top: '58%' }} />
          <span className="bb-node" style={{ left: '91%', top: '18%' }} />
          <span className="bb-node blue" style={{ left: '8%', top: '82%' }} />

          {/* Connection lines */}
          <div
            className="bb-connection"
            style={{
              width: '240px',
              left: '12%',
              top: '22%',
              transform: 'rotate(22deg)',
            }}
          >
            <span className="bb-signal" />
          </div>

          <div
            className="bb-connection"
            style={{
              width: '300px',
              left: '38%',
              top: '18%',
              transform: 'rotate(8deg)',
            }}
          >
            <span className="bb-signal" />
          </div>

          <div
            className="bb-connection"
            style={{
              width: '280px',
              left: '68%',
              top: '25%',
              transform: 'rotate(28deg)',
            }}
          >
            <span className="bb-signal" />
          </div>
        </div>

        <div className="relative z-10 max-w-5xl w-full">
          <div className="text-center mb-12">
            <p className="font-mono text-xs uppercase tracking-widest text-bb-muted mb-3">Connection Point</p>
            <h1 className="text-3xl sm:text-4xl font-bold text-bb-text">
              How do you connect to the{' '}
              <span className="text-gradient-crimson">BloodBridge</span> network?
            </h1>
            <p className="text-bb-dim mt-3 text-sm">Select your role to enter your dashboard.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {roles.map((role) => {
              const isHovered = hovered === role.id;
              return (
                <button
                  key={role.id}
                  onMouseEnter={() => setHovered(role.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onNavigate(role.id)}
                  className="group relative rounded-2xl p-6 text-left transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-bb-indigo"
                  style={{
                    background: isHovered ? role.hoverBg : role.cardBg,
                    border: `1px solid ${role.border}`,
                    transform: isHovered
                      ? 'translateY(-4px) scale(1.01)'
                      : 'translateY(0) scale(1)',
                    boxShadow: isHovered
                      ? `0 16px 40px ${role.border}`
                      : '0 4px 12px rgba(15, 23, 42, 0.06)',
                  }}
                >
                  {/* Role icon */}
                  <div
                    className="size-16 rounded-2xl flex items-center justify-center text-3xl mb-5 transition-all duration-300 group-hover:scale-110"
                    style={{
                      background: `${role.color}15`,
                      border: `1.5px solid ${role.color}40`,
                    }}
                  >
                    {role.icon}
                  </div>

                  <div className="space-y-1 mb-3">
                    <p className="font-bold text-xl text-bb-text">{role.title}</p>
                    <p className="font-mono text-xs tracking-widest" style={{ color: role.color }}>{role.subtitle}</p>
                  </div>

                  <p className="text-sm text-bb-dim leading-snug mb-4">{role.desc}</p>

                  <ul className="space-y-1.5">
                    {role.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs text-bb-muted">
                        <svg className="size-3 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true" style={{ color: role.color }}>
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div
                    className="mt-5 flex items-center gap-2 text-xs font-semibold transition-all duration-200"
                    style={{ color: isHovered ? role.color : '#5a7499' }}
                  >
                    Enter as {role.title}
                    <svg className="size-3 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>

                  {/* Connected line hint */}
                  {isHovered && (
                    <div
                      className="absolute -bottom-px left-1/2 -translate-x-1/2 h-0.5 w-12 rounded-full"
                      style={{ background: role.color }}
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-center text-xs text-bb-muted mt-8 font-mono">
            Demo mode — no authentication required. Select any role to explore.
          </p>
        </div>
      </div>
    </div>
  );
}
