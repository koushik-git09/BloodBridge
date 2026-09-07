import React from "react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionText,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-bb-border bg-white/40 p-8 text-center backdrop-blur-sm sm:p-12">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-red-50 text-bb-crimson shadow-inner">
        {icon || (
          <svg className="size-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        )}
      </div>
      <h3 className="text-lg font-bold text-bb-text">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-bb-muted">{description}</p>
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-bb-crimson px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-bb-crimson-bright shadow-sm active:scale-[0.99]"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
