import { parsePhone } from "./phone";
import { detectTimezoneForCountry, isValidIanaTimezone } from "./timezone";

export interface ResolvedClientIdentity {
  phoneE164: string | null;
  country: string | null;
  countryName: string | null;
  timezone: string | null;
  timezoneSource: "AUTO_DETECTED" | "MANUAL" | "UNDETERMINED";
  timezoneConfident: boolean;
  candidates: string[];
  phoneError?: string;
}

/**
 * Resolves phone, country, and timezone for a client, honoring the rule
 * that a manually-selected timezone always wins over auto-detection —
 * and that an ambiguous country (multiple IANA zones) is never guessed.
 */
export function resolveClientIdentity(params: {
  phone?: string | null;
  manualTimezone?: string | null;
}): ResolvedClientIdentity {
  const { phone, manualTimezone } = params;

  let phoneE164: string | null = null;
  let country: string | null = null;
  let countryName: string | null = null;
  let phoneError: string | undefined;

  if (phone && phone.trim().length > 0) {
    const parsed = parsePhone(phone);
    if (parsed.valid) {
      phoneE164 = parsed.e164;
      country = parsed.country;
      countryName = parsed.countryName;
    } else {
      phoneError = parsed.error;
    }
  }

  const detection = detectTimezoneForCountry(country);

  if (manualTimezone && manualTimezone.trim().length > 0) {
    const tz = manualTimezone.trim();
    if (!isValidIanaTimezone(tz)) {
      return {
        phoneE164,
        country,
        countryName,
        timezone: null,
        timezoneSource: "UNDETERMINED",
        timezoneConfident: false,
        candidates: detection.candidates,
        phoneError: phoneError ?? "Invalid IANA timezone selected",
      };
    }
    return {
      phoneE164,
      country,
      countryName,
      timezone: tz,
      timezoneSource: "MANUAL",
      timezoneConfident: true,
      candidates: detection.candidates,
      phoneError,
    };
  }

  return {
    phoneE164,
    country,
    countryName,
    timezone: detection.timezone,
    timezoneSource: detection.source,
    timezoneConfident: detection.confident,
    candidates: detection.candidates,
    phoneError,
  };
}
