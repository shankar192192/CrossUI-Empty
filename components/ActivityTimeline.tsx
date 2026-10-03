import {
  UserPlus,
  MessageSquare,
  FileEdit,
  RefreshCw,
  CalendarClock,
  CalendarCheck2,
  Globe2,
  BadgeCheck,
  Wallet,
  LucideIcon,
} from "lucide-react";
import { formatDateTime } from "@/lib/format";
import type { Activity } from "@/lib/types";

const ICONS: Record<string, LucideIcon> = {
  LEAD_CREATED: UserPlus,
  NOTE: MessageSquare,
  REQUIREMENT_UPDATED: FileEdit,
  STATUS_CHANGED: RefreshCw,
  DEMO_SCHEDULED: CalendarClock,
  DEMO_COMPLETED: CalendarCheck2,
  FOLLOW_UP_SCHEDULED: CalendarClock,
  FOLLOW_UP_LOGGED: CalendarCheck2,
  TIMEZONE_UPDATED: Globe2,
  CONVERTED: BadgeCheck,
  PAYMENT_RECORDED: Wallet,
};

export function ActivityTimeline({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return <p className="text-sm text-slate-400">No activity yet.</p>;
  }

  return (
    <ol className="relative border-l border-slate-200 ml-2">
      {activities.map((a) => {
        const Icon = ICONS[a.type] ?? MessageSquare;
        return (
          <li key={a.id} className="ml-5 mb-5 last:mb-0">
            <span className="absolute -left-[15px] flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 border border-brand-100">
              <Icon className="w-3.5 h-3.5 text-brand-600" />
            </span>
            <p className="text-sm text-slate-800">{a.message}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {formatDateTime(a.occurredAt)}
              {a.actor ? ` · ${a.actor.name}` : ""}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
