"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";

export interface DateRange {
  from: string; // yyyy-MM-dd
  to: string; // yyyy-MM-dd
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfWeek(d: Date): Date {
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? 6 : day - 1; // week starts Monday
  const result = new Date(d);
  result.setDate(d.getDate() - diff);
  return result;
}

const PRESETS = [
  { key: "all", label: "All time" },
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "custom", label: "Custom" },
] as const;

type PresetKey = (typeof PRESETS)[number]["key"];

/**
 * Shared date-range toggle used across Dashboard, Clients, Converted,
 * Payments, and Reports — filters whatever date field is relevant on that
 * page (date added, date converted, etc).
 */
export function DateRangeFilter({
  value,
  onChange,
}: {
  value: DateRange | null;
  onChange: (range: DateRange | null) => void;
}) {
  const [preset, setPreset] = useState<PresetKey>("all");
  const [showCustom, setShowCustom] = useState(false);

  function applyPreset(key: PresetKey) {
    setPreset(key);
    const now = new Date();
    if (key === "all") {
      setShowCustom(false);
      onChange(null);
    } else if (key === "today") {
      setShowCustom(false);
      const today = toDateStr(now);
      onChange({ from: today, to: today });
    } else if (key === "week") {
      setShowCustom(false);
      onChange({ from: toDateStr(startOfWeek(now)), to: toDateStr(now) });
    } else if (key === "month") {
      setShowCustom(false);
      onChange({ from: toDateStr(new Date(now.getFullYear(), now.getMonth(), 1)), to: toDateStr(now) });
    } else {
      setShowCustom(true);
      if (!value) onChange({ from: toDateStr(now), to: toDateStr(now) });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Calendar className="w-4 h-4 text-slate-400" />
      <div className="flex rounded-lg border border-slate-200 overflow-hidden">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => applyPreset(p.key)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              preset === p.key ? "bg-brand-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {showCustom && value && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            className="input py-1 text-xs w-auto"
            value={value.from}
            onChange={(e) => onChange({ from: e.target.value, to: value.to })}
          />
          <span className="text-slate-400 text-xs">to</span>
          <input
            type="date"
            className="input py-1 text-xs w-auto"
            value={value.to}
            onChange={(e) => onChange({ from: value.from, to: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
