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
 */
export function computeScheduledAt(localDate: string, localTime: string, timezone: string): Date {
  const [hours, minutes] = localTime.split(":").map(Number);
  const [year, month, day] = localDate.split("-").map(Number);

  const naive = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
  return fromZonedTime(naive, timezone);
}

/** Returns today's date (YYYY-MM-DD) as observed in the given timezone. */
export function todayInTimezone(timezone: string, now: Date = new Date()): string {
  return formatTz(toZonedTime(now, timezone), "yyyy-MM-dd", { timeZone: timezone });
}

function addDaysToDateString(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const naive = new Date(Date.UTC(y, m - 1, d + days));
  return formatTz(naive, "yyyy-MM-dd", { timeZone: "UTC" });
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
