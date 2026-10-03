import { describe, it, expect } from "vitest";
import { resolveClientIdentity } from "../clientResolution";

describe("resolveClientIdentity", () => {
  it("auto-detects timezone for a single-timezone country", () => {
    const result = resolveClientIdentity({ phone: "+442071838750" });
    expect(result.timezone).toBe("Europe/London");
    expect(result.timezoneSource).toBe("AUTO_DETECTED");
    expect(result.timezoneConfident).toBe(true);
  });

  it("leaves timezone undetermined for an ambiguous country with no manual override", () => {
    const result = resolveClientIdentity({ phone: "+12125551234" }); // US number
    expect(result.timezone).toBeNull();
    expect(result.timezoneSource).toBe("UNDETERMINED");
    expect(result.timezoneConfident).toBe(false);
    expect(result.candidates.length).toBeGreaterThan(1);
  });

  it("manual timezone always overrides auto-detection, even when auto-detection is confident", () => {
    // UK auto-detects confidently to Europe/London, but the user manually
    // picked a different (unusual but valid) zone — manual must win.
    const result = resolveClientIdentity({ phone: "+442071838750", manualTimezone: "Asia/Kolkata" });
    expect(result.timezone).toBe("Asia/Kolkata");
    expect(result.timezoneSource).toBe("MANUAL");
    expect(result.timezoneConfident).toBe(true);
  });

  it("manual timezone resolves an otherwise-ambiguous country", () => {
    const result = resolveClientIdentity({ phone: "+13105557890", manualTimezone: "America/Los_Angeles" });
    expect(result.timezone).toBe("America/Los_Angeles");
    expect(result.timezoneSource).toBe("MANUAL");
  });

  it("rejects an invalid manual timezone string rather than silently accepting it", () => {
    const result = resolveClientIdentity({ phone: "+442071838750", manualTimezone: "Mars/Colony_One" });
    expect(result.timezone).toBeNull();
    expect(result.phoneError).toBeTruthy();
  });

  it("surfaces a phone parse error for a number with no country code", () => {
    const result = resolveClientIdentity({ phone: "9876543210" });
    expect(result.phoneE164).toBeNull();
    expect(result.phoneError).toMatch(/country code/i);
  });

  it("handles clients with no phone at all (email-only identity)", () => {
    const result = resolveClientIdentity({ phone: null });
    expect(result.phoneE164).toBeNull();
    expect(result.country).toBeNull();
    expect(result.timezone).toBeNull();
  });
});
