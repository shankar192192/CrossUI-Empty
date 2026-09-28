"use client";

import { useEffect, useState } from "react";
import { format as formatTz, toZonedTime } from "date-fns-tz";

/**
 * Live-updating local time for a given IANA timezone. Purely client-side —
 * recomputes every tick from the browser clock, no server round-trip needed.
 */
export function LocalClock({
  timezone,
  className,
  withDate = false,
}: {
  timezone: string | null;
  className?: string;
  withDate?: boolean;
}) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000 * 15);
    return () => clearInterval(id);
  }, []);

  if (!timezone) {
    return <span className={`text-slate-400 italic ${className ?? ""}`}>Needs confirmation</span>;
  }

  if (!now) return <span className={className}>—</span>;

  const pattern = withDate ? "EEE, d MMM · h:mm a" : "h:mm a";
  const label = formatTz(toZonedTime(now, timezone), pattern, { timeZone: timezone });

  return <span className={className}>{label}</span>;
}
