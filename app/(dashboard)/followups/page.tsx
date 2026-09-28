"use client";

import { useCallback, useEffect, useState } from "react";
import { FollowUpCard } from "@/components/FollowUpCard";
import type { Client } from "@/lib/types";

export default function FollowUpsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/followups`);
    const data = await res.json();
    setClients(data.clients ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  function handleChanged(id: string, updated?: Client) {
    if (!updated) {
      load();
      return;
    }
    // A client that's no longer due today (converted, lost, or rescheduled
    // away) drops out of the list immediately without a full refetch.
    setClients((prev) => prev.filter((c) => c.id !== id));
  }

  const overdueCount = clients.filter((c) => c.nextFollowUpAt && new Date(c.nextFollowUpAt) < new Date()).length;

  return (
    <div className="p-6 md:p-8 max-w-[1000px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Today&apos;s Follow-ups</h1>
        <p className="text-sm text-slate-500 mt-1">
          {clients.length} to call today{overdueCount > 0 ? ` · ${overdueCount} overdue` : ""} — sorted by call time (IST)
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-slate-400">Loading…</div>
      ) : clients.length === 0 ? (
        <div className="card p-6 text-sm text-slate-400 text-center">No follow-ups due today. 🎉</div>
      ) : (
        <div className="space-y-3">
          {clients.map((c) => (
            <FollowUpCard key={c.id} client={c} onChanged={(updated) => handleChanged(c.id, updated)} />
          ))}
        </div>
      )}
    </div>
  );
}
