const STATUS_CONFIG: Record<string, { label: string; className: string; dot: string }> = {
  NEW_LEAD: { label: "New Lead", className: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
  DEMO_SCHEDULED: { label: "Demo Scheduled", className: "bg-purple-50 text-purple-700", dot: "bg-purple-500" },
  FOLLOW_UP: { label: "Follow-up", className: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  CONVERTED: { label: "Converted", className: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  LOST: { label: "Lost", className: "bg-slate-100 text-slate-500", dot: "bg-slate-400" },
};

export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.NEW_LEAD;
  return (
    <span className={`badge ${cfg.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PAID: { label: "Paid", className: "bg-emerald-50 text-emerald-700" },
  PARTIALLY_PAID: { label: "Partially Paid", className: "bg-amber-50 text-amber-700" },
  PENDING: { label: "Pending", className: "bg-slate-100 text-slate-600" },
  OVERDUE: { label: "Overdue", className: "bg-red-50 text-red-700" },
};

export function PaymentStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-slate-400 text-xs">—</span>;
  const cfg = PAYMENT_STATUS_CONFIG[status] ?? PAYMENT_STATUS_CONFIG.PENDING;
  return <span className={`badge ${cfg.className}`}>{cfg.label}</span>;
}

const URGENCY_CONFIG: Record<string, { label: string; className: string }> = {
  overdue: { label: "Overdue", className: "bg-red-50 text-red-700 animate-pulse" },
  due: { label: "Due now", className: "bg-orange-50 text-orange-700" },
  due_soon: { label: "Due soon", className: "bg-amber-50 text-amber-700" },
  scheduled: { label: "Scheduled", className: "bg-slate-100 text-slate-600" },
  resolved: { label: "Resolved", className: "bg-emerald-50 text-emerald-700" },
};

export function UrgencyBadge({ urgency }: { urgency: string }) {
  const cfg = URGENCY_CONFIG[urgency] ?? URGENCY_CONFIG.scheduled;
  return <span className={`badge ${cfg.className}`}>{cfg.label}</span>;
}
