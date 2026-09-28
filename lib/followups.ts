import { fromZonedTime, toZonedTime, format as formatTz } from "date-fns-tz";

export const DEFAULT_FOLLOWUP_TIME = "12:00";

/**
 * Converts a "wall clock" local date + time in a given IANA timezone into
 * the absolute UTC instant it represents. This is the single source of
 * truth used for all "is this follow-up due" comparisons.
 *
 * Because the conversion is computed per specific calendar date (not a
 * fixed offset), DST transitions are handled correctly: the same
 * "12:00 America/New_York" follow-up will resolve to a different UTC
 * instant in January (EST, UTC-5) than in July (EDT, UTC-4).
 */
export function computeScheduledAt(localDate: string, localTime: string, timezone: string): Date {
  const [hours, minutes] = localTime.split(":").map(Number);
  const [year, month, day] = localDate.split("-").map(Number);

  // Build a naive Date whose UTC-getter fields hold the *wall clock* values;
  // fromZonedTime interprets those fields as being in `timezone`.
  const naive = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
  return fromZonedTime(naive, timezone);
}

/** Returns today's date (YYYY-MM-DD) as observed in the given timezone. */
export function todayInTimezone(timezone: string, now: Date = new Date()): string {
  return formatTz(toZonedTime(now, timezone), "yyyy-MM-dd", { timeZone: timezone });
}

/**
 * Computes the default noon follow-up for a client, per spec: when a client
 * enters Follow-up status, schedule 12:00 PM in their local timezone. If
 * local noon has already passed today, roll forward to tomorrow so we never
 * silently create a follow-up in the past.
 */
export function computeDefaultNoonFollowUp(timezone: string, now: Date = new Date()) {
  const today = todayInTimezone(timezone, now);
  let scheduledAt = computeScheduledAt(today, DEFAULT_FOLLOWUP_TIME, timezone);

  if (scheduledAt.getTime() <= now.getTime()) {
    const [y, m, d] = today.split("-").map(Number);
    const tomorrowUtcNaive = new Date(Date.UTC(y, m - 1, d + 1));
    const tomorrow = formatTz(tomorrowUtcNaive, "yyyy-MM-dd", { timeZone: "UTC" });
    scheduledAt = computeScheduledAt(tomorrow, DEFAULT_FOLLOWUP_TIME, timezone);
    return { localDate: tomorrow, localTime: DEFAULT_FOLLOWUP_TIME, scheduledAt };
  }

  return { localDate: today, localTime: DEFAULT_FOLLOWUP_TIME, scheduledAt };
}

const DUE_SOON_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours
const OVERDUE_WINDOW_MS = 3 * 60 * 60 * 1000; // 3 hours past scheduled time

export type FollowUpUrgency = "overdue" | "due" | "due_soon" | "scheduled" | "resolved";

export function followUpUrgency(
  status: string,
  scheduledAt: Date,
  now: Date = new Date()
): FollowUpUrgency {
  if (status !== "PENDING") return "resolved";

  const diff = scheduledAt.getTime() - now.getTime();

  if (diff <= -OVERDUE_WINDOW_MS) return "overdue";
  if (diff <= 0) return "due";
  if (diff <= DUE_SOON_WINDOW_MS) return "due_soon";
  return "scheduled";
}

export function isDueNow(status: string, scheduledAt: Date, now: Date = new Date()): boolean {
  const urgency = followUpUrgency(status, scheduledAt, now);
  return urgency === "due" || urgency === "overdue";
}

export function formatLocalTime(date: Date, timezone: string, withDate = false): string {
  const pattern = withDate ? "d MMM yyyy, h:mm a" : "h:mm a";
  return formatTz(toZonedTime(date, timezone), pattern, { timeZone: timezone });
}
