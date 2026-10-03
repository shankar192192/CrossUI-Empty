import { describe, it, expect } from "vitest";
import { detectTimezoneForCountry, isValidIanaTimezone, timezonesForCountry } from "../timezone";

describe("detectTimezoneForCountry", () => {
  it("confidently auto-detects a single-timezone country (UK -> Europe/London)", () => {
    const result = detectTimezoneForCountry("GB");
    expect(result.confident).toBe(true);
    expect(result.source).toBe("AUTO_DETECTED");
    expect(result.timezone).toBe("Europe/London");
  });

  it("confidently auto-detects UAE -> Asia/Dubai", () => {
    const result = detectTimezoneForCountry("AE");
    expect(result.timezone).toBe("Asia/Dubai");
    expect(result.confident).toBe(true);
  });

  it("does NOT guess a timezone for a multi-timezone country like the US", () => {
    const result = detectTimezoneForCountry("US");
    expect(result.confident).toBe(false);
    expect(result.timezone).toBeNull();
    expect(result.source).toBe("UNDETERMINED");
    expect(result.candidates.length).toBeGreaterThan(1);
    expect(result.candidates).toContain("America/New_York");
    expect(result.candidates).toContain("America/Los_Angeles");
  });

  it("does NOT guess a timezone for multi-timezone Australia", () => {
    const result = detectTimezoneForCountry("AU");
    expect(result.confident).toBe(false);
    expect(result.candidates).toContain("Australia/Sydney");
    expect(result.candidates).toContain("Australia/Perth");
  });

  it("returns undetermined for a null/unknown country (phone country cannot be attributed)", () => {
    const result = detectTimezoneForCountry(null);
    expect(result.confident).toBe(false);
    expect(result.timezone).toBeNull();
    expect(result.candidates).toEqual([]);
  });

  it("lists candidate timezones for a country for manual-selection UIs", () => {
    const candidates = timezonesForCountry("US");
    expect(candidates).toContain("America/Chicago");
  });
});

describe("isValidIanaTimezone", () => {
  it("accepts known IANA zones", () => {
    expect(isValidIanaTimezone("Asia/Kolkata")).toBe(true);
    expect(isValidIanaTimezone("America/New_York")).toBe(true);
  });

  it("rejects garbage input", () => {
    expect(isValidIanaTimezone("Not/AZone")).toBe(false);
    expect(isValidIanaTimezone("")).toBe(false);
  });
});
