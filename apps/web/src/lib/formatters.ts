/**
 * Formats integer paise into formatted INR currency string (e.g. ₹250.00).
 */
export function formatPaiseToInr(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

/**
 * Formats ISO date-time into Asia/Kolkata date string (e.g. "Fri, 16 Oct 2026").
 */
export function formatIstDate(isoString: string): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

/**
 * Formats ISO date-time into Asia/Kolkata 12-hour time string (e.g. "06:30 PM").
 */
export function formatIstTime(isoString: string): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

/**
 * Formats duration in minutes into "2h 15m".
 */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
