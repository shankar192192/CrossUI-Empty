import { describe, it, expect } from "vitest";
import { parsePhone, isLikelyValidPhone } from "../phone";

describe("parsePhone", () => {
  it("parses a valid US number and detects country US", () => {
    const result = parsePhone("+1 415 555 2671");
    expect(result.valid).toBe(true);
    expect(result.country).toBe("US");
    expect(result.e164).toBe("+14155552671");
  });

  it("parses a valid Indian number and detects country IN", () => {
    const result = parsePhone("+91 98765 43210");
    expect(result.valid).toBe(true);
    expect(result.country).toBe("IN");
    expect(result.countryName).toBe("India");
  });

  it("parses a valid UAE number and detects country AE", () => {
    const result = parsePhone("+971501234567");
    expect(result.valid).toBe(true);
    expect(result.country).toBe("AE");
  });

  it("rejects a phone number without a country code (edge case: no country code)", () => {
    const result = parsePhone("9876543210");
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/country code/i);
  });

  it("rejects a structurally invalid phone number (edge case: invalid number)", () => {
    const result = parsePhone("+1 000");
    expect(result.valid).toBe(false);
  });

  it("rejects an empty string", () => {
    const result = parsePhone("");
    expect(result.valid).toBe(false);
  });

  it("isLikelyValidPhone matches parsePhone validity", () => {
    expect(isLikelyValidPhone("+14155552671")).toBe(true);
    expect(isLikelyValidPhone("not-a-phone")).toBe(false);
    expect(isLikelyValidPhone("4155552671")).toBe(false);
  });
});
