import { fromZonedTime, toZonedTime, format as formatTz } from "date-fns-tz";

/** The operator (PrepSeven) always calls from India. */
export const OPERATOR_TIMEZONE = "Asia/Kolkata";

/** Fixed daily call slot: 1:00 PM in the CLIENT's own local timezone. */
export const FOLLOWUP_CALL_TIME = "13:00";

/** Fixed IST slot demos are scheduled in, since the operator inputs demo times directly in IST. */
export const DEMO_TIMEZONE = OPERATOR_TIMEZONE;

/**
 * Converts a "wall clock" local date + time in a given IANA timezone into
 * the absolute UTC instant it represents. This is the single source of
 * truth used for all "is this due" comparisons.
 *
 * Because the conversion is computed per specific calendar date (not a
 * fixed offset), DST transitions are handled correctly.
 *
 * IMPORTANT: fromZonedTime must be given a plain "YYYY-MM-DDTHH:mm:ss"
 * string (no trailing Z/offset), which it parses field-by-field literally.
 * Passing a `Date` object instead is NOT equivalent — date-fns-tz reads a
 * Date's wall-clock fields via the JS runtime's *local* (system-timezone)
 * getters, so on a machine whose system timezone isn't UTC, a Date built
 * via `Date.UTC(...)` gets silently reinterpreted through that system
 * offset before the target-timezone conversion is even applied, producing
 * a result skewed by the system's own offset (e.g. every computed instant
 * off by exactly +5:30 on a machine set to IST). Always route through the
 * literal string form.
 */
export function computeScheduledAt(localDate: string, localTime: string, timezone: string): Date {
  return fromZonedTime(`${localDate}T${localTime}:00`, timezone);
}

/** Returns today's date (YYYY-MM-DD) as observed in the given timezone. */
export function todayInTimezone(timezone: string, now: Date = new Date()): string {
  return formatTz(toZonedTime(now, timezone), "yyyy-MM-dd", { timeZone: timezone });
}

// Pure UTC-epoch arithmetic on a date-only string — deliberately avoids
// routing through date-fns-tz's `format` here, since `format` given a raw
// Date (not one produced by `toZonedTime`) reads via the JS runtime's local
// getters and would reintroduce the same system-timezone sensitivity as
// the computeScheduledAt bug above. `.toISOString()` is always UTC by
// spec, so this stays correct regardless of the machine's system timezone.
function addDaysToDateString(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/**
 * Computes the follow-up instant for "tomorrow, 1:00 PM" in the given
 * timezone (the client's own timezone if confirmed, otherwise IST as a
 * fallback so a follow-up is always scheduled even before the timezone is
 * confirmed).
 */
export function computeNextDayFollowUp(timezone: string | null | undefined, now: Date = new Date()) {
  const tz = timezone ?? OPERATOR_TIMEZONE;
  const today = todayInTimezone(tz, now);
  const tomorrow = addDaysToDateString(today, 1);
  return computeScheduledAt(tomorrow, FOLLOWUP_CALL_TIME, tz);
}

/** Computes the follow-up instant for a specific calendar date at 1:00 PM client-local (or IST fallback). */
export function computeFollowUpForDate(localDate: string, timezone: string | null | undefined): Date {
  const tz = timezone ?? OPERATOR_TIMEZONE;
  return computeScheduledAt(localDate, FOLLOWUP_CALL_TIME, tz);
}

/**
 * Recomputes an already-scheduled follow-up slot after a client's timezone
 * changes (phone corrected, or manual override set/changed).
 *
 * The slot is an absolute instant computed FROM a timezone — if that
 * timezone was wrong (or just confirmed) after the slot was already set,
 * the old instant is stale relative to the corrected zone even though it
 * still displays a plausible-looking "1:00 PM" label. This keeps the same
 * intended calendar day (tracked via the operator's own IST calendar, so
 * "today" doesn't shift by editing a client's timezone) and just fixes
 * what UTC instant "1:00 PM" on that day actually corresponds to.
 */
export function recomputeFollowUpForTimezoneChange(existingNextFollowUpAt: Date, newTimezone: string | null | undefined): Date {
  const targetDate = todayInTimezone(OPERATOR_TIMEZONE, existingNextFollowUpAt);
  return computeFollowUpForDate(targetDate, newTimezone);
}

/** A client is due in today's follow-up list once their slot has arrived, up through the end of today in IST. */
export function isDueToday(nextFollowUpAt: Date | null, now: Date = new Date()): boolean {
  if (!nextFollowUpAt) return false;
  const endOfTodayIst = computeScheduledAt(todayInTimezone(OPERATOR_TIMEZONE, now), "23:59", OPERATOR_TIMEZONE);
  return nextFollowUpAt.getTime() <= endOfTodayIst.getTime();
}

/** How many whole days overdue (0 = due today, not yet overdue). */
export function daysOverdue(nextFollowUpAt: Date | null, now: Date = new Date()): number {
  if (!nextFollowUpAt) return 0;
  const todayIst = todayInTimezone(OPERATOR_TIMEZONE, now);
  const dueIst = todayInTimezone(OPERATOR_TIMEZONE, nextFollowUpAt);
  const todayMs = computeScheduledAt(todayIst, "00:00", OPERATOR_TIMEZONE).getTime();
  const dueMs = computeScheduledAt(dueIst, "00:00", OPERATOR_TIMEZONE).getTime();
  return Math.max(0, Math.round((todayMs - dueMs) / 86_400_000));
}

export function formatLocalTime(date: Date, timezone: string, withDate = false): string {
  const pattern = withDate ? "d MMM yyyy, h:mm a" : "h:mm a";
  return formatTz(toZonedTime(date, timezone), pattern, { timeZone: timezone });
}

/** Formats an absolute instant as the operator's own IST wall-clock time, e.g. "10:30 PM IST". */
export function formatInIST(date: Date): string {
  return `${formatTz(toZonedTime(date, OPERATOR_TIMEZONE), "h:mm a", { timeZone: OPERATOR_TIMEZONE })} IST`;
}
