/**
 * Robust date utilities to ensure backend UTC ISO timestamps
 * (even if naive or missing trailing Z) are always parsed as UTC
 * and accurately rendered in the user's local timezone.
 */

export function parseUtcDate(dateInput: string | Date | null | undefined): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return dateInput;
  const trimmed = dateInput.trim();
  if (!trimmed) return null;
  // If the ISO string lacks timezone specifier ('Z' or '+HH:MM' / '-HH:MM'), treat it as UTC
  const hasTimezone = /[Zz]|([+-]\d{2}:?\d{2})$/.test(trimmed);
  const normalized = hasTimezone ? trimmed : `${trimmed}Z`;
  const date = new Date(normalized);
  return isNaN(date.getTime()) ? null : date;
}

export function formatTime(dateInput: string | Date | null | undefined): string {
  const date = parseUtcDate(dateInput);
  if (!date) return "—";
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTime(dateInput: string | Date | null | undefined): string {
  const date = parseUtcDate(dateInput);
  if (!date) return "—";
  return date.toLocaleString();
}

export function formatDate(dateInput: string | Date | null | undefined): string {
  const date = parseUtcDate(dateInput);
  if (!date) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
