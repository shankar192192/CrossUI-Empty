import {
  parsePhoneNumberFromString,
  isValidPhoneNumber,
  type CountryCode,
} from "libphonenumber-js";
import * as ct from "countries-and-timezones";

export interface PhoneParseResult {
  valid: boolean;
  e164: string | null;
  country: CountryCode | null;
  countryName: string | null;
  raw: string;
  error?: string;
}

/**
 * Parses a phone number using libphonenumber-js. Requires an international
 * number (with a leading "+" and country code) since a bare local number
 * cannot reliably be attributed to a country.
 */
export function parsePhone(input: string): PhoneParseResult {
  const raw = input.trim();

  if (!raw) {
    return { valid: false, e164: null, country: null, countryName: null, raw, error: "Phone number is required" };
  }

  if (!raw.startsWith("+")) {
    return {
      valid: false,
      e164: null,
      country: null,
      countryName: null,
      raw,
      error: "Include the country code, e.g. +1, +91, +44 (international format required)",
    };
  }

  const phoneNumber = parsePhoneNumberFromString(raw);

  if (!phoneNumber || !phoneNumber.isValid()) {
    return { valid: false, e164: null, country: null, countryName: null, raw, error: "Invalid phone number" };
  }

  const country = phoneNumber.country ?? null;
  const countryInfo = country ? ct.getCountry(country) : null;

  return {
    valid: true,
    e164: phoneNumber.number,
    country,
    countryName: countryInfo?.name ?? null,
    raw,
  };
}

export function isLikelyValidPhone(input: string): boolean {
  if (!input || !input.trim().startsWith("+")) return false;
  try {
    return isValidPhoneNumber(input.trim());
  } catch {
    return false;
  }
}
