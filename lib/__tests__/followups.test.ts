import { describe, it, expect } from "vitest";
import {
  computeScheduledAt,
  computeDefaultNoonFollowUp,
  followUpUrgency,
  todayInTimezone,
} from "../followups";

describe("computeScheduledAt", () => {
  it("resolves different UTC instants for the same local 12:00 PM in different timezones", () => {
    // New York and Dubai clients both scheduled for "12:00 PM their time" on
    // the same calendar date must NOT collapse to the same UTC instant.
    const nyScheduled = computeScheduledAt("2026-01-15", "12:00", "America/New_York");
    const dubaiScheduled = computeScheduledAt("2026-01-15", "12:00", "Asia/Dubai");

    expect(nyScheduled.getTime()).not.toBe(dubaiScheduled.getTime());

    // In January, New York is EST (UTC-5) -> 12:00 local = 17:00 UTC
    expect(nyScheduled.toISOString()).toBe("2026-01-15T17:00:00.000Z");
    // Dubai is UTC+4 year-round -> 12:00 local = 08:00 UTC
    expect(dubaiScheduled.toISOString()).toBe("2026-01-15T08:00:00.000Z");
  });

  it("produces different UTC instants for India vs UK follow-ups", () => {
    const indiaScheduled = computeScheduledAt("2026-06-01", "12:00", "Asia/Kolkata"); // UTC+5:30
    const ukScheduled = computeScheduledAt("2026-06-01", "12:00", "Europe/London"); // BST UTC+1 in June

    expect(indiaScheduled.toISOString()).toBe("2026-06-01T06:30:00.000Z");
    expect(ukScheduled.toISOString()).toBe("2026-06-01T11:00:00.000Z");
    expect(indiaScheduled.getTime()).not.toBe(ukScheduled.getTime());
  });

  it("handles the daylight-saving transition for America/New_York (EST -> EDT)", () => {
    // Before DST starts (second Sunday of March 2026 = Mar 8): EST, UTC-5
    const beforeDst = computeScheduledAt("2026-03-01", "12:00", "America/New_York");
    expect(beforeDst.toISOString()).toBe("2026-03-01T17:00:00.000Z");

    // After DST starts: EDT, UTC-4 — the same local wall-clock time now maps
    // to a different UTC hour, proving DST is respected per calendar date.
    const afterDst = computeScheduledAt("2026-03-15", "12:00", "America/New_York");
    expect(afterDst.toISOString()).toBe("2026-03-15T16:00:00.000Z");
  });

  it("handles the daylight-saving transition for Australia (opposite hemisphere)", () => {
    // Sydney observes DST Oct-Apr (opposite of northern hemisphere).
    const summerAEDT = computeScheduledAt("2026-01-15", "12:00", "Australia/Sydney"); // AEDT UTC+11
    const winterAEST = computeScheduledAt("2026-07-15", "12:00", "Australia/Sydney"); // AEST UTC+10

    expect(summerAEDT.toISOString()).toBe("2026-01-15T01:00:00.000Z");
    expect(winterAEST.toISOString()).toBe("2026-07-15T02:00:00.000Z");
  });
});

describe("computeDefaultNoonFollowUp", () => {
  it("schedules today at noon local time when noon hasn't passed yet", () => {
    // 9:00 AM in India — local noon is still ahead today.
    const now = computeScheduledAt("2026-05-10", "09:00", "Asia/Kolkata");
    const result = computeDefaultNoonFollowUp("Asia/Kolkata", now);
    expect(result.localDate).toBe("2026-05-10");
    expect(result.scheduledAt.getTime()).toBeGreaterThan(now.getTime());
  });

  it("rolls forward to tomorrow when local noon has already passed today", () => {
    // 3:00 PM in India — local noon already happened, so default should be tomorrow.
    const now = computeScheduledAt("2026-05-10", "15:00", "Asia/Kolkata");
    const result = computeDefaultNoonFollowUp("Asia/Kolkata", now);
    expect(result.localDate).toBe("2026-05-11");
    expect(result.scheduledAt.getTime()).toBeGreaterThan(now.getTime());
  });
});

describe("followUpUrgency", () => {
  const now = new Date("2026-05-10T12:00:00.000Z");

  it("is 'scheduled' when far in the future", () => {
    const future = new Date(now.getTime() + 5 * 60 * 60 * 1000);
    expect(followUpUrgency("PENDING", future, now)).toBe("scheduled");
  });

  it("is 'due_soon' within the 2-hour window", () => {
    const soon = new Date(now.getTime() + 60 * 60 * 1000);
    expect(followUpUrgency("PENDING", soon, now)).toBe("due_soon");
  });

  it("is 'due' right at or just past the scheduled time", () => {
    expect(followUpUrgency("PENDING", now, now)).toBe("due");
  });

  it("is 'overdue' more than 3 hours past scheduled time", () => {
    const late = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    expect(followUpUrgency("PENDING", late, now)).toBe("overdue");
  });

  it("is 'resolved' for a completed follow-up regardless of time", () => {
    const late = new Date(now.getTime() - 100 * 60 * 60 * 1000);
    expect(followUpUrgency("COMPLETED", late, now)).toBe("resolved");
  });
});

describe("todayInTimezone", () => {
  it("returns a different calendar date across the date line at the same instant", () => {
    // 23:30 UTC on 2026-05-10 is already 2026-05-11 in India (UTC+5:30).
    const instant = new Date("2026-05-10T23:30:00.000Z");
    expect(todayInTimezone("UTC", instant)).toBe("2026-05-10");
    expect(todayInTimezone("Asia/Kolkata", instant)).toBe("2026-05-11");
  });
});
