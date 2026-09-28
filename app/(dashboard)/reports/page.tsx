"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/format";

const COLORS = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0891b2", "#db2777", "#65a30d"];

interface ReportData {
  summary: {
    leadsGenerated: number;
    converted: number;
    conversionRate: number;
    demos: number;
    followUps: number;
    revenue: number;
    profit: number;
    pending: number;
  };
  bySource: Record<string, { leads: number; converted: number; revenue: number }>;
  byCountry: Record<string, { name: string; leads: number; converted: number; revenue: number }>;
  byMonth: Record<string, { leads: number; converted: number; revenue: number }>;
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const res = await fetch(`/api/reports?${params.toString()}`);
    setData(await res.json());
  }, [dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  if (!data) return <div className="p-8 text-slate-400 text-sm">Loading reports…</div>;

  const sourceData = Object.entries(data.bySource).map(([source, v]) => ({ source: source.replace("_", " "), ...v }));
  const countryData = Object.values(data.byCountry).sort((a, b) => b.leads - a.leads);
  const monthData = Object.entries(data.byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v }));

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500 mt-1">Pipeline and revenue performance</p>
        </div>
        <div className="flex gap-2">
          <div>
            <label className="label">From</label>
            <input type="date" className="input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" className="input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Leads Generated" value={data.summary.leadsGenerated} />
        <SummaryCard label="Conversion Rate" value={`${data.summary.conversionRate}%`} />
        <SummaryCard label="Demos Held" value={data.summary.demos} />
        <SummaryCard label="Follow-ups" value={data.summary.followUps} />
        <SummaryCard label="Revenue" value={formatCurrency(data.summary.revenue)} tone="success" />
        <SummaryCard label="Profit" value={formatCurrency(data.summary.profit)} tone="success" />
        <SummaryCard label="Pending Payments" value={formatCurrency(data.summary.pending)} tone="warning" />
        <SummaryCard label="Converted" value={data.summary.converted} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Leads by Month</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="leads" fill="#2563eb" radius={[4, 4, 0, 0]} name="Leads" />
              <Bar dataKey="converted" fill="#059669" radius={[4, 4, 0, 0]} name="Converted" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Leads by Source</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={sourceData} dataKey="leads" nameKey="source" cx="50%" cy="50%" outerRadius={90} label>
                {sourceData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Leads &amp; Revenue by Country</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={countryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="leads" fill="#2563eb" radius={[4, 4, 0, 0]} name="Leads" />
              <Bar dataKey="converted" fill="#059669" radius={[4, 4, 0, 0]} name="Converted" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string | number; tone?: "success" | "warning" }) {
  const color = tone === "success" ? "text-emerald-600" : tone === "warning" ? "text-amber-600" : "text-slate-900";
  return (
    <div className="card p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-xl font-semibold mt-1 ${color}`}>{value}</p>
    </div>
  );
}
