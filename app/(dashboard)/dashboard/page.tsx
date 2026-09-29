"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Sparkles,
  Presentation,
  CalendarClock,
  BadgeCheck,
  XCircle,
  IndianRupee,
  TrendingUp,
  Wallet,
  Plus,
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { FollowUpCard } from "@/components/FollowUpCard";
import { StatusBadge, PaymentStatusBadge } from "@/components/StatusBadge";
import { LocalClock } from "@/components/LocalClock";
import { ClientFormModal } from "@/components/ClientFormModal";
import { DateRangeFilter, type DateRange } from "@/components/DateRangeFilter";
import { countryFlag, formatCurrency, formatDate } from "@/lib/format";
import type { Client, DashboardMetrics } from "@/lib/types";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [todaysFollowUps, setTodaysFollowUps] = useState<Client[]>([]);
  const [recentLeads, setRecentLeads] = useState<Client[]>([]);
  const [attentionPayments, setAttentionPayments] = useState<Client[]>([]);
  const [showAddClient, setShowAddClient] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (dateRange) {
      params.set("dateFrom", dateRange.from);
      params.set("dateTo", dateRange.to);
    }
    const [dashRes, paymentsRes] = await Promise.all([
      fetch(`/api/dashboard?${params.toString()}`).then((r) => r.json()),
      fetch("/api/clients?converted=true&sort=pending&pageSize=8").then((r) => r.json()),
    ]);
    setMetrics(dashRes.metrics);
    setTodaysFollowUps(dashRes.todaysFollowUps ?? []);
    setRecentLeads(dashRes.recentLeads ?? []);
    setAttentionPayments((paymentsRes.clients ?? []).filter((c: Client) => (c.pendingPayment ?? 0) > 0));
  }, [dateRange]);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  function handleFollowUpChanged(id: string) {
    setTodaysFollowUps((prev) => prev.filter((c) => c.id !== id));
  }

  if (!metrics) {
    return <div className="p-8 text-slate-400 text-sm">Loading dashboard…</div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{greeting()}</h1>
          <p className="text-sm text-slate-500 mt-1">Here&apos;s what&apos;s happening across your pipeline.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
          <button onClick={() => setShowAddClient(true)} className="btn-primary shrink-0">
            <Plus className="w-4 h-4" /> Add Client
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 2xl:grid-cols-7 gap-3">
        <StatCard label="Total Leads" value={metrics.totalLeads} icon={Users} href="/clients" />
        <StatCard label="New Leads" value={metrics.newLeads} icon={Sparkles} href="/clients?status=NEW_LEAD" />
        <StatCard label="Demo Scheduled" value={metrics.demoScheduled} icon={Presentation} href="/clients?status=DEMO_SCHEDULED" />
        <StatCard
          label="Follow-ups Due Today"
          value={metrics.followUpsDueToday}
          icon={CalendarClock}
          tone={metrics.followUpsDueToday > 0 ? "warning" : "default"}
          href="/followups"
        />
        <StatCard label="Converted" value={metrics.converted} icon={BadgeCheck} tone="success" href="/converted" />
        <StatCard label="Lost" value={metrics.lost} icon={XCircle} tone="danger" href="/clients?status=LOST" />
        <StatCard label="Total Revenue" value={formatCurrency(metrics.totalRevenue)} icon={IndianRupee} href="/converted" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard label="Total Profit" value={formatCurrency(metrics.totalProfit)} icon={TrendingUp} tone="success" href="/converted" />
        <StatCard label="Pending Payments" value={formatCurrency(metrics.pendingPayments)} icon={Wallet} tone="warning" href="/payments" />
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-900">Today&apos;s Follow-ups</h2>
          <Link href="/followups" className="text-sm text-brand-600 hover:underline">
            View all
          </Link>
        </div>
        {todaysFollowUps.length === 0 ? (
          <div className="card p-6 text-sm text-slate-400 text-center">No follow-ups due today. 🎉</div>
        ) : (
          <div className="space-y-3">
            {todaysFollowUps.slice(0, 5).map((c) => (
              <FollowUpCard key={c.id} client={c} onChanged={() => handleFollowUpChanged(c.id)} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-900">Recent Leads</h2>
          <Link href="/clients" className="text-sm text-brand-600 hover:underline">
            View all
          </Link>
        </div>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                <th className="px-4 py-2.5 font-medium">Client</th>
                <th className="px-4 py-2.5 font-medium">Requirement</th>
                <th className="px-4 py-2.5 font-medium">Country</th>
                <th className="px-4 py-2.5 font-medium">Local Time</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Added</th>
              </tr>
            </thead>
            <tbody>
              {recentLeads.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <Link href={`/clients/${c.id}`} className="font-medium text-slate-800 hover:text-brand-600">
                      {countryFlag(c.country)} {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{c.requirement ?? "—"}</td>
                  <td className="px-4 py-2.5 text-slate-500">{c.countryName ?? "—"}</td>
                  <td className="px-4 py-2.5 text-slate-500">
                    <LocalClock timezone={c.timezone} />
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-2.5 text-slate-400">{formatDate(c.dateAdded)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-900">Pending Payments</h2>
          <Link href="/payments" className="text-sm text-brand-600 hover:underline">
            View all
          </Link>
        </div>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                <th className="px-4 py-2.5 font-medium">Client</th>
                <th className="px-4 py-2.5 font-medium">Revenue</th>
                <th className="px-4 py-2.5 font-medium">Received</th>
                <th className="px-4 py-2.5 font-medium">Pending</th>
                <th className="px-4 py-2.5 font-medium">Due Date</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {attentionPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    No pending payments. Nice.
                  </td>
                </tr>
              ) : (
                attentionPayments.map((c) => (
                  <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <Link href={`/clients/${c.id}`} className="font-medium text-slate-800 hover:text-brand-600">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{formatCurrency(c.totalRevenue)}</td>
                    <td className="px-4 py-2.5 text-slate-600">{formatCurrency(c.amountReceived)}</td>
                    <td className="px-4 py-2.5 font-medium text-amber-700">{formatCurrency(c.pendingPayment)}</td>
                    <td className="px-4 py-2.5 text-slate-400">{formatDate(c.paymentDueDate)}</td>
                    <td className="px-4 py-2.5">
                      <PaymentStatusBadge status={c.paymentStatus} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showAddClient && (
        <ClientFormModal
          onClose={() => setShowAddClient(false)}
          onSaved={() => {
            setShowAddClient(false);
            load();
          }}
        />
      )}
    </div>
  );
}
