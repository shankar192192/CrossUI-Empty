"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search, Plus, SlidersHorizontal } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { LocalClock } from "@/components/LocalClock";
import { ClientFormModal } from "@/components/ClientFormModal";
import { countryFlag, formatDate } from "@/lib/format";
import type { Client } from "@/lib/types";

const STATUS_OPTIONS = ["NEW_LEAD", "DEMO_SCHEDULED", "FOLLOW_UP", "CONVERTED", "LOST"];
const STATUS_LABEL: Record<string, string> = {
  NEW_LEAD: "New Lead",
  DEMO_SCHEDULED: "Demo Scheduled",
  FOLLOW_UP: "Follow-up",
  CONVERTED: "Converted",
  LOST: "Lost",
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [leadSource, setLeadSource] = useState("");
  const [followUpDue, setFollowUpDue] = useState(false);
  const [sort, setSort] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (leadSource) params.set("leadSource", leadSource);
    if (followUpDue) params.set("followUpDue", "true");
    params.set("sort", sort);
    params.set("pageSize", "50");

    const res = await fetch(`/api/clients?${params.toString()}`);
    const data = await res.json();
    setClients(data.clients ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [q, status, leadSource, followUpDue, sort]);

  useEffect(() => {
    const id = setTimeout(load, 250);
    return () => clearTimeout(id);
  }, [load]);

  async function quickChangeStatus(client: Client, newStatus: string) {
    setClients((prev) => prev.map((c) => (c.id === client.id ? { ...c, status: newStatus as Client["status"] } : c)));
    await fetch(`/api/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    load();
  }

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">All Clients</h1>
          <p className="text-sm text-slate-500 mt-1">{total} total</p>
        </div>
        <button onClick={() => setShowAddClient(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Client
        </button>
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="input pl-9"
              placeholder="Search name, phone, email, requirement…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select className="input w-auto" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="followup">Follow-up time</option>
            <option value="revenue">Revenue</option>
            <option value="profit">Profit</option>
            <option value="pending">Pending payment</option>
            <option value="name">Name A–Z</option>
          </select>
          <button onClick={() => setShowFilters((s) => !s)} className="btn-secondary">
            <SlidersHorizontal className="w-4 h-4" /> Filters
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-100">
            <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <select className="input w-auto" value={leadSource} onChange={(e) => setLeadSource(e.target.value)}>
              <option value="">All lead sources</option>
              {["WEBSITE", "REFERRAL", "INSTAGRAM", "FACEBOOK", "GOOGLE_ADS", "WHATSAPP_INBOUND", "WALK_IN", "PARTNER_SCHOOL", "OTHER"].map(
                (s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                )
              )}
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-600 px-2">
              <input type="checkbox" checked={followUpDue} onChange={(e) => setFollowUpDue(e.target.checked)} />
              Follow-up due
            </label>
          </div>
        )}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
              <th className="px-4 py-2.5 font-medium">Client</th>
              <th className="px-4 py-2.5 font-medium">Requirement</th>
              <th className="px-4 py-2.5 font-medium">Country / Timezone</th>
              <th className="px-4 py-2.5 font-medium">Local Time</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Added</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            ) : clients.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No clients match your filters.
                </td>
              </tr>
            ) : (
              clients.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <Link href={`/clients/${c.id}`} className="font-medium text-slate-800 hover:text-brand-600">
                      {countryFlag(c.country)} {c.name}
                    </Link>
                    <p className="text-xs text-slate-400">{c.phone || c.email}</p>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{c.requirement ?? "—"}</td>
                  <td className="px-4 py-2.5 text-slate-500">
                    {c.countryName ?? "—"}
                    <br />
                    <span className="text-xs text-slate-400">{c.timezone ?? "Needs confirmation"}</span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">
                    <LocalClock timezone={c.timezone} />
                  </td>
                  <td className="px-4 py-2.5">
                    <select
                      value={c.status}
                      onChange={(e) => quickChangeStatus(c, e.target.value)}
                      className="text-xs rounded-full border-0 bg-transparent font-medium cursor-pointer focus:ring-2 focus:ring-brand-200"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                    <div className="mt-1">
                      <StatusBadge status={c.status} />
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-slate-400">{formatDate(c.dateAdded)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAddClient && (
        <ClientFormModal
          onClose={() => setShowAddClient(false)}
          onSaved={() => {
            setShowAddClient(false);
            load();
          }}
        />
      )}
      {editingClient && (
        <ClientFormModal
          client={editingClient}
          onClose={() => setEditingClient(null)}
          onSaved={() => {
            setEditingClient(null);
            load();
          }}
        />
      )}
    </div>
  );
}
