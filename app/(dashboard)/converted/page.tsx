"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PaymentStatusBadge } from "@/components/StatusBadge";
import { PaymentModal } from "@/components/PaymentModal";
import { formatCurrency, formatDate, countryFlag } from "@/lib/format";
import type { Client } from "@/lib/types";

export default function ConvertedPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingClient, setPayingClient] = useState<Client | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/clients?converted=true&pageSize=100&sort=newest");
    const data = await res.json();
    setClients(data.clients ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totals = clients.reduce(
    (acc, c) => {
      acc.revenue += c.totalRevenue ?? 0;
      acc.profit += c.profit ?? 0;
      acc.received += c.amountReceived;
      acc.pending += c.pendingPayment ?? 0;
      return acc;
    },
    { revenue: 0, profit: 0, received: 0, pending: 0 }
  );

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Converted Clients</h1>
        <p className="text-sm text-slate-500 mt-1">{clients.length} converted</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-4">
          <p className="text-xs text-slate-500">Total Revenue</p>
          <p className="text-xl font-semibold text-slate-900 mt-1">{formatCurrency(totals.revenue)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500">Total Profit</p>
          <p className="text-xl font-semibold text-emerald-600 mt-1">{formatCurrency(totals.profit)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500">Total Received</p>
          <p className="text-xl font-semibold text-slate-900 mt-1">{formatCurrency(totals.received)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500">Total Pending</p>
          <p className="text-xl font-semibold text-amber-600 mt-1">{formatCurrency(totals.pending)}</p>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
              <th className="px-4 py-2.5 font-medium">Client</th>
              <th className="px-4 py-2.5 font-medium">Product / Service</th>
              <th className="px-4 py-2.5 font-medium">Revenue</th>
              <th className="px-4 py-2.5 font-medium">Cost</th>
              <th className="px-4 py-2.5 font-medium">Profit</th>
              <th className="px-4 py-2.5 font-medium">Received</th>
              <th className="px-4 py-2.5 font-medium">Pending</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Converted</th>
              <th className="px-4 py-2.5 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            ) : clients.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                  No converted clients yet.
                </td>
              </tr>
            ) : (
              clients.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <Link href={`/clients/${c.id}`} className="font-medium text-slate-800 hover:text-brand-600">
                      {countryFlag(c.country)} {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{c.productService ?? "—"}</td>
                  <td className="px-4 py-2.5 text-slate-700">{formatCurrency(c.totalRevenue)}</td>
                  <td className="px-4 py-2.5 text-slate-500">{formatCurrency(c.totalCost)}</td>
                  <td className="px-4 py-2.5 font-medium text-emerald-700">{formatCurrency(c.profit)}</td>
                  <td className="px-4 py-2.5 text-slate-700">{formatCurrency(c.amountReceived)}</td>
                  <td className="px-4 py-2.5 font-medium text-amber-700">{formatCurrency(c.pendingPayment)}</td>
                  <td className="px-4 py-2.5">
                    <PaymentStatusBadge status={c.paymentStatus} />
                  </td>
                  <td className="px-4 py-2.5 text-slate-400">{formatDate(c.convertedAt)}</td>
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
