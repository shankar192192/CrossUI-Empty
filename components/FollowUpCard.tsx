"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle, Mail, CheckCircle2, CalendarClock, BadgeCheck, Eye, Loader2 } from "lucide-react";
import { LocalClock } from "./LocalClock";
import { UrgencyBadge } from "./StatusBadge";
import { countryFlag } from "@/lib/format";
import { followUpUrgency } from "@/lib/followups";
import { RescheduleModal } from "./RescheduleModal";
import { ConvertModal } from "./ConvertModal";
import type { Client, FollowUp } from "@/lib/types";

export function FollowUpCard({
  followUp,
  onChanged,
}: {
  followUp: FollowUp & { client: Client };
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const client = followUp.client;

  const urgency = followUpUrgency(followUp.status, new Date(followUp.scheduledAt));

  async function markFollowedUp() {
    setBusy(true);
    await fetch(`/api/followups/${followUp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "COMPLETED" }),
    });
    setBusy(false);
    onChanged();
  }

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg leading-none">{countryFlag(client.country)}</span>
            <Link href={`/clients/${client.id}`} className="font-semibold text-slate-900 hover:text-brand-600 truncate">
              {client.name}
            </Link>
            <UrgencyBadge urgency={urgency} />
          </div>
          <p className="text-sm text-slate-500 mt-0.5 truncate">{client.requirement ?? "No requirement noted"}</p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
            {client.phone && (
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5" /> {client.phone}
              </span>
            )}
            {client.email && (
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" /> {client.email}
              </span>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="text-xs text-slate-400">{client.timezone ?? "Timezone unknown"}</p>
          <p className="text-lg font-semibold text-slate-900">
            <LocalClock timezone={client.timezone} />
          </p>
          <p className="text-xs text-slate-400">Follow-up: {followUp.localTime}</p>
        </div>
      </div>

      {followUp.note && (
        <p className="mt-3 text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">{followUp.note}</p>
      )}

      <div className="flex flex-wrap gap-2 mt-3">
        {followUp.status === "PENDING" && (
          <>
            <button onClick={markFollowedUp} disabled={busy} className="btn-secondary text-xs py-1.5">
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Mark Followed Up
            </button>
            <button onClick={() => setShowReschedule(true)} className="btn-secondary text-xs py-1.5">
              <CalendarClock className="w-3.5 h-3.5" /> Reschedule
            </button>
            {client.status !== "CONVERTED" && (
              <button onClick={() => setShowConvert(true)} className="btn-secondary text-xs py-1.5">
                <BadgeCheck className="w-3.5 h-3.5" /> Convert
              </button>
            )}
          </>
        )}
        <Link href={`/clients/${client.id}`} className="btn-ghost text-xs py-1.5">
          <Eye className="w-3.5 h-3.5" /> View Client
        </Link>
      </div>

      {showReschedule && client.timezone && (
        <RescheduleModal
          followUp={followUp}
          clientTimezone={client.timezone}
          onClose={() => setShowReschedule(false)}
          onRescheduled={() => {
            setShowReschedule(false);
            onChanged();
          }}
        />
      )}

      {showConvert && (
        <ConvertModal
          client={client}
          onClose={() => setShowConvert(false)}
          onConverted={() => {
            setShowConvert(false);
            onChanged();
          }}
        />
      )}
    </div>
  );
}
