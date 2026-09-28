"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FollowUpCard } from "@/components/FollowUpCard";
import { followUpUrgency } from "@/lib/followups";
import type { Client, FollowUp } from "@/lib/types";

type Tab = "all" | "overdue" | "due" | "due_soon" | "scheduled" | "history";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All pending" },
  { key: "overdue", label: "Overdue" },
  { key: "due", label: "Due now" },
  { key: "due_soon", label: "Due soon" },
  { key: "scheduled", label: "Scheduled" },
  { key: "history", label: "History" },
];

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<(FollowUp & { client: Client })[]>([]);
  const [tab, setTab] = useState<Tab>("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const status = tab === "history" ? "ALL" : "PENDING";
    const res = await fetch(`/api/followups?status=${status}`);
    const data = await res.json();
    setFollowUps(data.followUps ?? []);
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  const filtered = useMemo(() => {
    if (tab === "all" || tab === "history") return followUps;
    return followUps.filter((f) => followUpUrgency(f.status, new Date(f.scheduledAt)) === tab);
  }, [followUps, tab]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { overdue: 0, due: 0, due_soon: 0, scheduled: 0 };
    for (const f of followUps) {
      const u = followUpUrgency(f.status, new Date(f.scheduledAt));
      if (u in c) c[u]++;
    }
    return c;
  }, [followUps]);

  return (
    <div className="p-6 md:p-8 max-w-[1000px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Follow-ups</h1>
        <p className="text-sm text-slate-500 mt-1">
          {counts.overdue} overdue · {counts.due} due now · {counts.due_soon} due soon
        </p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key ? "border-brand-600 text-brand-600" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-slate-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="card p-6 text-sm text-slate-400 text-center">No follow-ups here.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((f) => (
            <FollowUpCard key={f.id} followUp={f} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  );
}
