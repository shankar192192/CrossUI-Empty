import { describe, it, expect } from "vitest";
import {
  computeScheduledAt,
  computeNextDayFollowUp,
  computeFollowUpForDate,
  recomputeFollowUpForTimezoneChange,
  isDueToday,
  daysOverdue,
  todayInTimezone,
  formatInIST,
  OPERATOR_TIMEZONE,
} from "../followups";

describe("computeScheduledAt", () => {
  it("resolves different UTC instants for the same local 1:00 PM call slot in different timezones", () => {
    // New York and Dubai clients both scheduled for "1:00 PM their time" on
    // the same calendar date must NOT collapse to the same UTC instant.
    const nyScheduled = computeScheduledAt("2026-01-15", "13:00", "America/New_York");
    const dubaiScheduled = computeScheduledAt("2026-01-15", "13:00", "Asia/Dubai");

    expect(nyScheduled.getTime()).not.toBe(dubaiScheduled.getTime());

    // In January, New York is EST (UTC-5) -> 13:00 local = 18:00 UTC
    expect(nyScheduled.toISOString()).toBe("2026-01-15T18:00:00.000Z");
    // Dubai is UTC+4 year-round -> 13:00 local = 09:00 UTC
    expect(dubaiScheduled.toISOString()).toBe("2026-01-15T09:00:00.000Z");
  });

  it("produces different UTC instants for India vs UK follow-ups", () => {
    const indiaScheduled = computeScheduledAt("2026-06-01", "13:00", "Asia/Kolkata"); // UTC+5:30
    const ukScheduled = computeScheduledAt("2026-06-01", "13:00", "Europe/London"); // BST UTC+1 in June

    expect(indiaScheduled.toISOString()).toBe("2026-06-01T07:30:00.000Z");
    expect(ukScheduled.toISOString()).toBe("2026-06-01T12:00:00.000Z");
    expect(indiaScheduled.getTime()).not.toBe(ukScheduled.getTime());
  });

  it("handles the daylight-saving transition for America/New_York (EST -> EDT)", () => {
    const beforeDst = computeScheduledAt("2026-03-01", "13:00", "America/New_York");
    expect(beforeDst.toISOString()).toBe("2026-03-01T18:00:00.000Z");

    const afterDst = computeScheduledAt("2026-03-15", "13:00", "America/New_York");
    expect(afterDst.toISOString()).toBe("2026-03-15T17:00:00.000Z");
  });

  it("handles the daylight-saving transition for Australia (opposite hemisphere)", () => {
    const summerAEDT = computeScheduledAt("2026-01-15", "13:00", "Australia/Sydney"); // AEDT UTC+11
    const winterAEST = computeScheduledAt("2026-07-15", "13:00", "Australia/Sydney"); // AEST UTC+10

    expect(summerAEDT.toISOString()).toBe("2026-01-15T02:00:00.000Z");
    expect(winterAEST.toISOString()).toBe("2026-07-15T03:00:00.000Z");
  });
});

describe("computeNextDayFollowUp", () => {
  it("schedules 1PM tomorrow in the client's own timezone, relative to that timezone's current date", () => {
    // 11:00 AM EDT on May 10 in New York (same calendar date in both IST and NY at this instant).
    const now = new Date("2026-05-10T15:00:00.000Z");
    const result = computeNextDayFollowUp("America/New_York", now);
    // Tomorrow (May 11) 13:00 America/New_York in May = EDT (UTC-4) -> 17:00 UTC
    expect(result.toISOString()).toBe("2026-05-11T17:00:00.000Z");
  });

  it("computes 'tomorrow' relative to the CLIENT's own current calendar date, not the operator's", () => {
    // 9:00 AM IST on May 10 is still 11:30 PM on May 9 in New York (EDT, UTC-4) —
    // so the client's own "tomorrow" is May 10, even though it's already May 10 in IST.
    const now = computeScheduledAt("2026-05-10", "09:00", "Asia/Kolkata");
    const result = computeNextDayFollowUp("America/New_York", now);
    expect(result.toISOString()).toBe("2026-05-10T17:00:00.000Z");
  });

  it("falls back to IST when the client's timezone is not yet confirmed", () => {
    const now = computeScheduledAt("2026-05-10", "09:00", OPERATOR_TIMEZONE);
    const result = computeNextDayFollowUp(null, now);
    const expected = computeScheduledAt("2026-05-11", "13:00", OPERATOR_TIMEZONE);
    expect(result.toISOString()).toBe(expected.toISOString());
  });

  it("rolls the calendar date forward correctly even right at a day boundary", () => {
    // 11:59 PM IST on May 10 -> "tomorrow" must be May 11, not May 10 again.
    const now = computeScheduledAt("2026-05-10", "23:59", OPERATOR_TIMEZONE);
    const result = computeNextDayFollowUp(OPERATOR_TIMEZONE, now);
    expect(todayInTimezone(OPERATOR_TIMEZONE, result)).toBe("2026-05-11");
  });
});

describe("computeFollowUpForDate", () => {
  it("always uses the 1:00 PM local slot for a specific chosen date", () => {
    const result = computeFollowUpForDate("2026-06-20", "Asia/Kolkata");
    expect(result.toISOString()).toBe(computeScheduledAt("2026-06-20", "13:00", "Asia/Kolkata").toISOString());
  });
});

describe("isDueToday", () => {
  it("is true once the slot has arrived", () => {
    const now = new Date("2026-05-10T12:00:00.000Z");
    const slot = new Date("2026-05-10T09:00:00.000Z");
    expect(isDueToday(slot, now)).toBe(true);
  });

  it("is true for anything overdue from a previous day", () => {
    const now = new Date("2026-05-10T12:00:00.000Z");
    const slot = new Date("2026-05-05T09:00:00.000Z");
    expect(isDueToday(slot, now)).toBe(true);
  });

  it("is true for a slot scheduled later THIS SAME day (e.g. a US client's evening-IST call slot)", () => {
    // This is the core "call list for the whole day" behavior: a client
    // whose 1PM-their-time slot lands at 10:30 PM IST still belongs in
    // today's list, not tomorrow's, even before that time has arrived.
    const now = computeScheduledAt("2026-05-10", "09:00", OPERATOR_TIMEZONE);
    const laterToday = computeScheduledAt("2026-05-10", "22:30", OPERATOR_TIMEZONE);
    expect(isDueToday(laterToday, now)).toBe(true);
  });

  it("is false for a slot scheduled on a future day", () => {
    const now = computeScheduledAt("2026-05-10", "09:00", OPERATOR_TIMEZONE);
    const tomorrow = computeScheduledAt("2026-05-11", "13:00", OPERATOR_TIMEZONE);
    expect(isDueToday(tomorrow, now)).toBe(false);
  });

  it("is false when there is no follow-up scheduled", () => {
    expect(isDueToday(null)).toBe(false);
  });
});

describe("daysOverdue", () => {
  it("is 0 for a follow-up due today", () => {
    const now = computeScheduledAt("2026-05-10", "18:00", OPERATOR_TIMEZONE);
    const dueToday = computeScheduledAt("2026-05-10", "13:00", OPERATOR_TIMEZONE);
    expect(daysOverdue(dueToday, now)).toBe(0);
  });

  it("counts whole IST calendar days late", () => {
    const now = computeScheduledAt("2026-05-10", "18:00", OPERATOR_TIMEZONE);
    const threeDaysAgo = computeScheduledAt("2026-05-07", "13:00", OPERATOR_TIMEZONE);
    expect(daysOverdue(threeDaysAgo, now)).toBe(3);
  });
});

describe("todayInTimezone", () => {
  it("returns a different calendar date across the date line at the same instant", () => {
    const instant = new Date("2026-05-10T23:30:00.000Z");
    expect(todayInTimezone("UTC", instant)).toBe("2026-05-10");
    expect(todayInTimezone("Asia/Kolkata", instant)).toBe("2026-05-11");
  });
});

describe("formatInIST", () => {
  it("converts a US client's own 1PM call slot into the operator's IST wall-clock time", () => {
    // 1:00 PM EDT (America/New_York, summer) = 10:30 PM IST the same day.
    const slot = computeScheduledAt("2026-07-01", "13:00", "America/New_York");
    expect(formatInIST(slot)).toBe("10:30 PM IST");
  });
});

describe("recomputeFollowUpForTimezoneChange", () => {
  it("fixes a stale slot when a client's timezone is corrected after creation (regression)", () => {
    // Client was created as UK (single-tz, auto-detected), giving a slot at
    // 1PM London time. Their phone is then corrected to an Indian number —
    // the slot must be recomputed for 1PM Asia/Kolkata on the SAME
    // intended day, not left pointing at the old London instant (which,
    // left stale, would display as "6:30 PM IST" instead of "1:00 PM IST").
    const staleUkSlot = computeScheduledAt("2026-09-29", "13:00", "Europe/London"); // BST, UTC+1
    expect(formatInIST(staleUkSlot)).toBe("5:30 PM IST");

    const corrected = recomputeFollowUpForTimezoneChange(staleUkSlot, "Asia/Kolkata");
    expect(formatInIST(corrected)).toBe("1:00 PM IST");
    // Same calendar day is preserved, only the instant is fixed.
    expect(todayInTimezone(OPERATOR_TIMEZONE, corrected)).toBe(todayInTimezone(OPERATOR_TIMEZONE, staleUkSlot));
  });

  it("falls back to IST when the corrected timezone is still unconfirmed", () => {
    const staleSlot = computeScheduledAt("2026-09-29", "13:00", "Europe/London");
    const corrected = recomputeFollowUpForTimezoneChange(staleSlot, null);
    expect(formatInIST(corrected)).toBe("1:00 PM IST");
  });
});
