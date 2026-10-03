"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle, Mail, CheckCircle2, CalendarClock, BadgeCheck, Eye, Loader2, Flame } from "lucide-react";
import { LocalClock } from "./LocalClock";
import { StatusBadge } from "./StatusBadge";
import { countryFlag } from "@/lib/format";
import { formatInIST, daysOverdue } from "@/lib/followups";
import { SetFollowUpDateModal } from "./SetFollowUpDateModal";
import { LostReasonModal } from "./LostReasonModal";
import { ConvertModal } from "./ConvertModal";
import type { Client } from "@/lib/types";

export function FollowUpCard({ client, onChanged }: { client: Client; onChanged: (client?: Client) => void }) {
  const [busy, setBusy] = useState(false);
  const [showSetDate, setShowSetDate] = useState(false);
  const [showLost, setShowLost] = useState(false);
  const [showConvert, setShowConvert] = useState(false);

  const nextFollowUpAt = client.nextFollowUpAt ? new Date(client.nextFollowUpAt) : null;
  const overdue = nextFollowUpAt ? daysOverdue(nextFollowUpAt) : 0;

  async function markDoneTomorrow() {
    setBusy(true);
    const res = await fetch(`/api/clients/${client.id}/followup-action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "tomorrow" }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) onChanged(data.client);
  }

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg leading-none">{countryFlag(client.country)}</span>
            <Link href={`/clients/${client.id}`} className="font-semibold text-slate-900 hover:text-brand-600 truncate">
              {client.name}
            </Link>
            <StatusBadge status={client.status} />
            {client.followUpPriority && (
              <span className="badge bg-orange-50 text-orange-700">
                <Flame className="w-3 h-3" /> Priority
              </span>
            )}
            {overdue > 0 && (
              <span className="badge bg-red-50 text-red-700">
                {overdue} day{overdue > 1 ? "s" : ""} overdue
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-0.5 truncate">{client.requirement ?? "No requirement noted"}</p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
            {client.phone && (
              <span className="flex items-center gap-1 min-w-0 break-all">
                <MessageCircle className="w-3.5 h-3.5 shrink-0" /> {client.phone}
              </span>
            )}
            {client.email && (
              <span className="flex items-center gap-1 min-w-0 break-all">
                <Mail className="w-3.5 h-3.5 shrink-0" /> {client.email}
              </span>
            )}
          </div>
        </div>

        <div className="text-right shrink-0 ml-auto">
          <p className="text-xs text-slate-400">{client.timezone ?? "Timezone unknown"}</p>
          <p className="text-lg font-semibold text-slate-900">
            <LocalClock timezone={client.timezone} />
          </p>
          {nextFollowUpAt && <p className="text-xs font-medium text-brand-600">Call at {formatInIST(nextFollowUpAt)}</p>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        <button onClick={markDoneTomorrow} disabled={busy} className="btn-secondary text-xs py-1.5">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
          Followed Up — Tomorrow
        </button>
        <button onClick={() => setShowSetDate(true)} className="btn-secondary text-xs py-1.5">
          <CalendarClock className="w-3.5 h-3.5" /> Set Date
        </button>
        <button onClick={() => setShowConvert(true)} className="btn-secondary text-xs py-1.5">
          <BadgeCheck className="w-3.5 h-3.5" /> Convert
        </button>
        <button onClick={() => setShowLost(true)} className="btn-ghost text-xs py-1.5 text-red-500">
          Mark Lost
        </button>
        <Link href={`/clients/${client.id}`} className="btn-ghost text-xs py-1.5">
          <Eye className="w-3.5 h-3.5" /> View Client
        </Link>
      </div>

      {showSetDate && (
        <SetFollowUpDateModal
          client={client}
          onClose={() => setShowSetDate(false)}
          onDone={(c) => {
            setShowSetDate(false);
            onChanged(c);
          }}
        />
      )}
      {showLost && (
        <LostReasonModal
          client={client}
          onClose={() => setShowLost(false)}
          onDone={(c) => {
            setShowLost(false);
            onChanged(c);
          }}
        />
      )}
      {showConvert && (
        <ConvertModal
          client={client}
          onClose={() => setShowConvert(false)}
          onConverted={(c) => {
            setShowConvert(false);
            onChanged(c);
          }}
        />
      )}
    </div>
  );
}
