import * as ct from "countries-and-timezones";

export type TimezoneSource = "AUTO_DETECTED" | "MANUAL" | "UNDETERMINED";

export interface TimezoneDetectionResult {
  timezone: string | null;
  source: TimezoneSource;
  confident: boolean;
  candidates: string[]; // all IANA zones valid for the detected country
}

/**
 * Given an ISO 3166-1 alpha-2 country code, determines the client's timezone.
 *
 * IMPORTANT: a phone number's country does not uniquely determine a
 * timezone for countries that span multiple zones (US, Canada, Australia,
 * Russia, Brazil, ...). In that case we deliberately refuse to guess — we
 * return confident=false and the full candidate list so the caller can
 * force a manual selection ("Needs confirmation") rather than silently
 * picking one.
 */
export function detectTimezoneForCountry(countryCode: string | null | undefined): TimezoneDetectionResult {
  if (!countryCode) {
    return { timezone: null, source: "UNDETERMINED", confident: false, candidates: [] };
  }

  const country = ct.getCountry(countryCode.toUpperCase());
  if (!country || country.timezones.length === 0) {
    return { timezone: null, source: "UNDETERMINED", confident: false, candidates: [] };
  }

  if (country.timezones.length === 1) {
    return {
      timezone: country.timezones[0],
      source: "AUTO_DETECTED",
      confident: true,
      candidates: country.timezones,
    };
  }

  // Multiple timezones possible for this country — do not guess.
  return {
    timezone: null,
    source: "UNDETERMINED",
    confident: false,
    candidates: [...country.timezones],
  };
}

export function isValidIanaTimezone(tz: string): boolean {
  if (!tz) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function allTimezones(): string[] {
  return Object.keys(ct.getAllTimezones()).sort();
}

export function timezonesForCountry(countryCode: string | null | undefined): string[] {
  if (!countryCode) return [];
  const country = ct.getCountry(countryCode.toUpperCase());
  return country ? [...country.timezones] : [];
}

/** Current UTC offset in minutes for a given IANA timezone, e.g. -240 for EDT. */
export function currentUtcOffsetMinutes(tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "shortOffset",
  });
  const part = dtf.formatToParts(new Date()).find((p) => p.type === "timeZoneName")?.value ?? "GMT+0";
  const match = part.match(/GMT([+-]\d{1,2})(?::?(\d{2}))?/);
  if (!match) return 0;
  const hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  return hours * 60 + (hours < 0 ? -minutes : minutes);
}

const ALL_COUNTRIES = ct.getAllCountries();

export function countryNameFor(code: string | null | undefined): string | null {
  if (!code) return null;
  return ALL_COUNTRIES[code.toUpperCase() as keyof typeof ALL_COUNTRIES]?.name ?? null;
}
