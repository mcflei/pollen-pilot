/** Local-time YYYY-MM-DD for a given date (defaults to now). */
export function localDateStr(date: Date = new Date()): string {
  return (
    `${date.getFullYear()}-` +
    `${String(date.getMonth() + 1).padStart(2, '0')}-` +
    `${String(date.getDate()).padStart(2, '0')}`
  );
}

/** Local-time YYYY-MM-DD for a UTC ISO timestamp string. */
export function localDateOf(isoTimestamp: string): string {
  return localDateStr(new Date(isoTimestamp));
}

/** Milliseconds until the next local midnight. */
export function msUntilLocalMidnight(): number {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

/** Subtract n calendar days in local time (safe across DST). */
export function localDateMinusDays(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - n);
}
