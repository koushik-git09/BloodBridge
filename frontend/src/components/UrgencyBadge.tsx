import type { Urgency } from '../types';

interface Props {
  urgency: Urgency;
  size?: 'sm' | 'md';
}

const config = {
  CRITICAL: { label: 'CRITICAL', dot: 'bg-bb-crimson-bright animate-blink', text: 'text-bb-crimson-bright', bg: 'bg-bb-crimson/10 border-bb-crimson/30' },
  URGENT: { label: 'URGENT', dot: 'bg-bb-amber', text: 'text-bb-amber', bg: 'bg-bb-amber/10 border-bb-amber/30' },
  NORMAL: { label: 'NORMAL', dot: 'bg-bb-teal', text: 'text-bb-teal', bg: 'bg-bb-teal/10 border-bb-teal/30' },
};

export default function UrgencyBadge({ urgency, size = 'sm' }: Props) {
  const c = config[urgency];
  const pad = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-xs';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded border font-mono font-bold tracking-widest ${pad} ${c.bg} ${c.text}`}>
      <span className={`size-1.5 rounded-full ${c.dot}`} aria-hidden="true" />
      {c.label}
    </span>
  );
}
