import { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  hint,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "default" | "warning" | "success" | "danger";
  hint?: string;
}) {
  const toneClass = {
    default: "bg-brand-50 text-brand-600",
    warning: "bg-amber-50 text-amber-600",
    success: "bg-emerald-50 text-emerald-600",
    danger: "bg-red-50 text-red-600",
  }[tone];

  return (
    <div className="card p-4 flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="text-2xl font-semibold text-slate-900 mt-1">{value}</p>
        {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
      </div>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${toneClass}`}>
        <Icon className="w-[18px] h-[18px]" />
      </div>
    </div>
  );
}
