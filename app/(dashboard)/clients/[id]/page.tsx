"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Clock3,
  Pencil,
  CalendarPlus,
  BadgeCheck,
  Wallet,
  CheckCircle2,
  Loader2,
  Flame,
  Presentation,
  Trash2,
} from "lucide-react";
import { StatusBadge, PaymentStatusBadge } from "@/components/StatusBadge";
import { LocalClock } from "@/components/LocalClock";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { ClientFormModal } from "@/components/ClientFormModal";
import { ConvertModal } from "@/components/ConvertModal";
import { PaymentModal } from "@/components/PaymentModal";
import { DemoScheduleModal } from "@/components/DemoScheduleModal";
import { SetFollowUpDateModal } from "@/components/SetFollowUpDateModal";
import { LostReasonModal } from "@/components/LostReasonModal";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { formatCurrency, formatDate, countryFlag } from "@/lib/format";
import { formatInIST, formatLocalTime, OPERATOR_TIMEZONE } from "@/lib/followups";
import type { Client } from "@/lib/types";

const FOLLOWUP_OUTCOME_LABEL: Record<string, string> = {
  FOLLOWED_UP_NEXT_DAY: "Followed up — next follow-up tomorrow",
  FOLLOWED_UP_SPECIFIC_DATE: "Followed up — next follow-up on a specific date",
  DEMO_COMPLETED: "Demo completed",
  CONVERTED: "Converted",
  LOST: "Marked lost",
};

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [showSetDate, setShowSetDate] = useState(false);
  const [showLost, setShowLost] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [completingDemo, setCompletingDemo] = useState(false);
  const [markingTomorrow, setMarkingTomorrow] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/clients/${params.id}`);
    if (res.status === 404) {
      setNotFound(true);
      return;
    }
    const data = await res.json();
    setClient(data.client);
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function completeDemo() {
    if (!client) return;
    setCompletingDemo(true);
    await fetch(`/api/clients/${client.id}/demo/complete`, { method: "POST" });
    setCompletingDemo(false);
    load();
  }

  async function markTomorrow() {
    if (!client) return;
    setMarkingTomorrow(true);
    await fetch(`/api/clients/${client.id}/followup-action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "tomorrow" }),
    });
    setMarkingTomorrow(false);
    load();
  }

  async function deleteClient() {
    if (!client) return;
    const res = await fetch(`/api/clients/${client.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Failed to delete client");
    }
    router.push("/clients");
  }

  if (notFound) {
    return (
      <div className="p-8">
        <p className="text-slate-500">Client not found.</p>
        <Link href="/clients" className="text-brand-600 text-sm hover:underline">
          Back to clients
        </Link>
      </div>
    );
  }

  if (!client) {
    return <div className="p-8 text-slate-400 text-sm">Loading…</div>;
  }

  const inFollowUpRotation = client.status === "NEW_LEAD" || client.status === "FOLLOW_UP";

  return (
    <div className="p-6 md:p-8 max-w-[1200px] mx-auto space-y-6">
      <div>
        <button onClick={() => router.back()} className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xl">{countryFlag(client.country)}</span>
              <h1 className="text-2xl font-semibold text-slate-900">{client.name}</h1>
              <StatusBadge status={client.status} />
              {client.followUpPriority && (
                <span className="badge bg-orange-50 text-orange-700">
                  <Flame className="w-3 h-3" /> Priority
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-1">{client.requirement ?? "No requirement noted"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowEdit(true)} className="btn-secondary">
              <Pencil className="w-4 h-4" /> Edit
            </button>
            {inFollowUpRotation && (
              <button onClick={() => setShowDemo(true)} className="btn-secondary">
                <Presentation className="w-4 h-4" /> Schedule Demo
              </button>
            )}
            {client.status === "DEMO_SCHEDULED" && (
              <button onClick={completeDemo} disabled={completingDemo} className="btn-secondary">
                {completingDemo ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Mark Demo Done
              </button>
            )}
            {client.status !== "CONVERTED" && client.status !== "LOST" && (
              <button onClick={() => setShowConvert(true)} className="btn-primary">
                <BadgeCheck className="w-4 h-4" /> Convert Client
              </button>
            )}
            {client.status === "CONVERTED" && (
              <button onClick={() => setShowPayment(true)} className="btn-primary">
                <Wallet className="w-4 h-4" /> Record Payment
              </button>
            )}
            <button onClick={() => setShowDelete(true)} className="btn-ghost text-red-500" title="Permanently delete this client">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Basic info */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Basic Information</h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <Info icon={Phone} label="Phone / WhatsApp" value={client.phone ?? "—"} />
              <Info icon={Mail} label="Email" value={client.email ?? "—"} />
              <Info icon={MapPin} label="Country" value={client.countryName ?? "—"} />
              <div>
                <dt className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock3 className="w-3.5 h-3.5" /> Timezone
                </dt>
                <dd className="text-slate-800 mt-0.5">
                  {client.timezone ?? <span className="text-amber-600 italic">Needs confirmation</span>}
                  {client.timezoneSource === "MANUAL" && (
                    <span className="ml-1.5 text-[10px] uppercase tracking-wide text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">
                      manual
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Current local time</dt>
                <dd className="text-slate-800 mt-0.5 font-medium">
                  <LocalClock timezone={client.timezone} withDate />
                </dd>
              </div>
              <Info label="Lead source" value={client.leadSource?.name ?? "—"} />
              <Info label="Date added" value={formatDate(client.dateAdded)} />
              {client.demoAt && <Info label="Demo scheduled (IST)" value={formatInIST(new Date(client.demoAt))} />}
            </dl>
            {client.notes && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <dt className="text-xs text-slate-400 mb-1">Notes</dt>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{client.notes}</p>
              </div>
            )}
          </div>

          {/* Financial info */}
          {client.status === "CONVERTED" && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-900">Financial Information</h2>
                <PaymentStatusBadge status={client.paymentStatus} />
              </div>
              <dl className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <Info label="Product / service" value={client.productService ?? "—"} />
                <Info label="Conversion date" value={formatDate(client.convertedAt)} />
                <Info label="Payment due date" value={formatDate(client.paymentDueDate)} />
                <Info label="Total revenue" value={formatCurrency(client.totalRevenue)} />
                <Info label="Total cost" value={formatCurrency(client.totalCost)} />
                <Info label="Profit (auto)" value={formatCurrency(client.profit)} />
                <Info label="Amount received" value={formatCurrency(client.amountReceived)} />
                <Info label="Pending payment (auto)" value={formatCurrency(client.pendingPayment)} />
              </dl>
              {client.conversionNotes && (
                <p className="text-sm text-slate-600 mt-3 pt-3 border-t border-slate-100">{client.conversionNotes}</p>
              )}

              {client.payments && client.payments.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-400 mb-2">Payment history</p>
                  <div className="space-y-1.5">
                    {client.payments.map((p) => (
                      <div key={p.id} className="flex justify-between text-sm">
                        <span className="text-slate-600">
                          {formatDate(p.paidAt)} {p.method ? `· ${p.method}` : ""}
                        </span>
                        <span className="font-medium text-slate-800">{formatCurrency(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {client.status === "LOST" && client.lostReason && (
            <div className="card p-5 border-l-4 border-l-red-300">
              <h2 className="text-sm font-semibold text-slate-900 mb-1">Lost Reason</h2>
              <p className="text-sm text-slate-600">{client.lostReason}</p>
            </div>
          )}

          {/* Next follow-up */}
          {inFollowUpRotation && (
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-slate-900 mb-3">Next Follow-up</h2>
              {client.nextFollowUpAt ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-800 font-medium">Call at {formatInIST(new Date(client.nextFollowUpAt))}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatLocalTime(new Date(client.nextFollowUpAt), client.timezone ?? OPERATOR_TIMEZONE, true)}{" "}
                      {client.timezone ?? "IST (fallback)"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={markTomorrow} disabled={markingTomorrow} className="btn-secondary text-xs py-1.5">
                      {markingTomorrow ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Followed Up — Tomorrow
                    </button>
                    <button onClick={() => setShowSetDate(true)} className="btn-secondary text-xs py-1.5">
                      <CalendarPlus className="w-3.5 h-3.5" /> Set Date
                    </button>
                    <button onClick={() => setShowLost(true)} className="btn-ghost text-xs py-1.5 text-red-500">
                      Mark Lost
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No follow-up scheduled.</p>
              )}
            </div>
          )}

          {/* Follow-up history */}
          {client.followUpLogs && client.followUpLogs.length > 0 && (
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-slate-900 mb-3">Follow-up History</h2>
              <div className="space-y-2">
                {client.followUpLogs.map((log) => (
                  <div key={log.id} className="flex items-start justify-between rounded-lg border border-slate-100 px-3 py-2.5">
                    <div>
                      <p className="text-sm text-slate-800">{FOLLOWUP_OUTCOME_LABEL[log.outcome] ?? log.outcome}</p>
                      {log.note && <p className="text-xs text-slate-500 mt-0.5">{log.note}</p>}
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">{formatDate(log.occurredAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Activity Timeline</h2>
            <ActivityTimeline activities={client.activities ?? []} />
          </div>
        </div>
      </div>

      {showEdit && (
        <ClientFormModal
          client={client}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false);
            load();
          }}
        />
      )}
      {showConvert && (
        <ConvertModal
          client={client}
          onClose={() => setShowConvert(false)}
          onConverted={() => {
            setShowConvert(false);
            load();
          }}
        />
      )}
      {showPayment && (
        <PaymentModal
          client={client}
          onClose={() => setShowPayment(false)}
          onRecorded={() => {
            setShowPayment(false);
            load();
          }}
        />
      )}
      {showDemo && (
        <DemoScheduleModal
          client={client}
          onClose={() => setShowDemo(false)}
          onScheduled={() => {
            setShowDemo(false);
            load();
          }}
        />
      )}
      {showSetDate && (
        <SetFollowUpDateModal
          client={client}
          onClose={() => setShowSetDate(false)}
          onDone={() => {
            setShowSetDate(false);
            load();
          }}
        />
      )}
      {showLost && (
        <LostReasonModal
          client={client}
          onClose={() => setShowLost(false)}
          onDone={() => {
            setShowLost(false);
            load();
          }}
        />
      )}
      {showDelete && (
        <ConfirmDeleteModal
          title={`Delete ${client.name}?`}
          message="This permanently removes the client and all of their follow-up history, payments, and activity — this cannot be undone. If you just want to record that this lead didn't work out, use Mark Lost instead."
          onClose={() => setShowDelete(false)}
          onConfirm={deleteClient}
        />
      )}
    </div>
  );
}

function Info({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div>
      <dt className="text-xs text-slate-400 flex items-center gap-1">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {label}
      </dt>
      <dd className="text-slate-800 mt-0.5">{value}</dd>
    </div>
  );
}
