import type { TimelineEvent } from '../types';

interface Props {
  events: TimelineEvent[];
}

export default function RequestTimeline({ events }: Props) {
  return (
    <ol className="relative" aria-label="Request journey timeline">
      {events.map((ev, i) => {
        const isLast = i === events.length - 1;
        return (
          <li key={i} className="flex gap-3 pb-4 last:pb-0">
            <div className="flex flex-col items-center">
              <div
                className={`relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border ${
                  ev.completed
                    ? 'bg-bb-teal border-bb-teal text-bb-bg'
                    : ev.active
                    ? 'bg-bb-indigo/20 border-bb-indigo text-bb-indigo'
                    : 'bg-bb-surface border-bb-border text-bb-muted'
                }`}
              >
                {ev.active ? (
                  <span className="size-2 rounded-full bg-bb-indigo animate-blink" aria-hidden="true" />
                ) : ev.completed ? (
                  <svg className="size-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="size-2 rounded-full bg-bb-border" aria-hidden="true" />
                )}
              </div>
              {!isLast && (
                <div
                  className={`mt-1 w-px flex-1 ${ev.completed ? 'bg-bb-teal/40' : 'bg-bb-border'}`}
                  aria-hidden="true"
                />
              )}
            </div>
            <div className="pb-1">
              <p className={`text-sm font-medium leading-tight ${ev.completed ? 'text-bb-text' : ev.active ? 'text-bb-indigo' : 'text-bb-muted'}`}>
                {ev.event}
              </p>
              <p className="mt-0.5 font-mono text-xs text-bb-muted">{ev.time}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
