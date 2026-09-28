"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PaymentStatusBadge } from "@/components/StatusBadge";
import { PaymentModal } from "@/components/PaymentModal";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Client } from "@/lib/types";

const STATUS_FILTERS = [
  { key: "", label: "All" },
  { key: "PAID", label: "Paid" },
  { key: "PARTIALLY_PAID", label: "Partially Paid" },
  { key: "PENDING", label: "Pending" },
  { key: "OVERDUE", label: "Overdue" },
];

export default function PaymentsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [payingClient, setPayingClient] = useState<Client | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ converted: "true", pageSize: "100", sort: "pending" });
    if (statusFilter) params.set("paymentStatus", statusFilter);
    const res = await fetch(`/api/clients?${params.toString()}`);
    const data = await res.json();
    setClients(data.clients ?? []);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = clients.reduce(
    (acc, c) => {
      acc.revenue += c.totalRevenue ?? 0;
      acc.received += c.amountReceived;
      acc.pending += c.pendingPayment ?? 0;
      if (c.paymentStatus === "OVERDUE") acc.overdue++;
      return acc;
    },
    { revenue: 0, received: 0, pending: 0, overdue: 0 }
  );

  const dueSoon = clients.filter((c) => {
    if (!c.paymentDueDate || c.paymentStatus === "PAID") return false;
    const days = (new Date(c.paymentDueDate).getTime() - Date.now()) / 86_400_000;
    return days >= 0 && days <= 7;
  }).length;

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Payments</h1>
        <p className="text-sm text-slate-500 mt-1">Track revenue collection across all converted clients</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="card p-4">
          <p className="text-xs text-slate-500">Total Revenue</p>
          <p className="text-xl font-semibold text-slate-900 mt-1">{formatCurrency(totals.revenue)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500">Total Received</p>
          <p className="text-xl font-semibold text-emerald-600 mt-1">{formatCurrency(totals.received)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500">Total Pending</p>
          <p className="text-xl font-semibold text-amber-600 mt-1">{formatCurrency(totals.pending)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500">Overdue</p>
          <p className="text-xl font-semibold text-red-600 mt-1">{totals.overdue}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500">Due Within 7 Days</p>
          <p className="text-xl font-semibold text-slate-900 mt-1">{dueSoon}</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              statusFilter === f.key ? "border-brand-600 text-brand-600" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {f.label}
          </button>
        ))}
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
              <th className="px-4 py-2.5 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            ) : clients.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  Nothing here.
                </td>
              </tr>
            ) : (
              clients.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <Link href={`/clients/${c.id}`} className="font-medium text-slate-800 hover:text-brand-600">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">{formatCurrency(c.totalRevenue)}</td>
                  <td className="px-4 py-2.5 text-slate-700">{formatCurrency(c.amountReceived)}</td>
                  <td className="px-4 py-2.5 font-medium text-amber-700">{formatCurrency(c.pendingPayment)}</td>
                  <td className="px-4 py-2.5 text-slate-400">{formatDate(c.paymentDueDate)}</td>
                  <td className="px-4 py-2.5">
                    <PaymentStatusBadge status={c.paymentStatus} />
                  </td>
                  <td className="px-4 py-2.5">
                    {(c.pendingPayment ?? 0) > 0 && (
                      <button onClick={() => setPayingClient(c)} className="btn-secondary text-xs py-1">
                        Record Payment
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {payingClient && (
        <PaymentModal
          client={payingClient}
          onClose={() => setPayingClient(null)}
          onRecorded={() => {
            setPayingClient(null);
            load();
          }}
        />
      )}
    </div>
  );
}
