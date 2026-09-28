"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "./Modal";
import { parsePhone } from "@/lib/phone";
import { detectTimezoneForCountry, timezonesForCountry } from "@/lib/timezone";
import { Loader2, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import type { Client } from "@/lib/types";

const LEAD_SOURCES = [
  ["WEBSITE", "Website"],
  ["REFERRAL", "Referral"],
  ["INSTAGRAM", "Instagram"],
  ["FACEBOOK", "Facebook"],
  ["GOOGLE_ADS", "Google Ads"],
  ["WHATSAPP_INBOUND", "WhatsApp Inbound"],
  ["WALK_IN", "Walk-in"],
  ["PARTNER_SCHOOL", "Partner School"],
  ["OTHER", "Other"],
] as const;

interface Props {
  onClose: () => void;
  onSaved: (client: Client) => void;
  client?: Client | null;
}

export function ClientFormModal({ onClose, onSaved, client }: Props) {
  const isEdit = !!client;

  const [name, setName] = useState(client?.name ?? "");
  const [phone, setPhone] = useState(client?.phone ?? "");
  const [email, setEmail] = useState(client?.email ?? "");
  const [requirement, setRequirement] = useState(client?.requirement ?? "");
  const [notes, setNotes] = useState(client?.notes ?? "");
  const [leadSource, setLeadSource] = useState(client?.leadSource ?? "OTHER");
  const [manualTimezone, setManualTimezone] = useState(
    client?.timezoneSource === "MANUAL" ? client.timezone ?? "" : ""
  );
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [assignedUserId, setAssignedUserId] = useState(client?.assignedUserId ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []))
      .catch(() => {});
  }, []);

  const phonePreview = useMemo(() => {
    if (!phone.trim()) return null;
    return parsePhone(phone);
  }, [phone]);

  const detection = useMemo(() => {
    if (!phonePreview?.valid || !phonePreview.country) return null;
    return detectTimezoneForCountry(phonePreview.country);
  }, [phonePreview]);

  const candidateTimezones = useMemo(() => {
    if (manualTimezone && phonePreview?.country) {
      return timezonesForCountry(phonePreview.country);
    }
    return detection?.candidates ?? [];
  }, [detection, manualTimezone, phonePreview]);

  const effectiveTimezone = manualTimezone || detection?.timezone || null;
  const needsManualSelection = !!phonePreview?.valid && !detection?.confident && !manualTimezone;

  async function submit(force = false) {
    setError(null);
    setSubmitting(true);

    if (!name.trim()) {
      setError("Name is required");
      setSubmitting(false);
      return;
    }
    if (!phone.trim() && !email.trim()) {
      setError("Provide at least a phone number or an email address");
      setSubmitting(false);
      return;
    }
    if (phone.trim() && phonePreview && !phonePreview.valid) {
      setError(phonePreview.error ?? "Invalid phone number");
      setSubmitting(false);
      return;
    }

    const payload = {
      name: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      requirement: requirement.trim() || undefined,
      notes: notes.trim() || undefined,
      leadSource,
      manualTimezone: manualTimezone || undefined,
      assignedUserId: assignedUserId || undefined,
    };

    try {
      const url = isEdit ? `/api/clients/${client!.id}` : `/api/clients${force ? "?force=true" : ""}`;
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.status === 409) {
        setDuplicate(data.duplicate);
        setSubmitting(false);
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setSubmitting(false);
        return;
      }

      onSaved(data.client);
    } catch {
      setError("Network error — please try again");
      setSubmitting(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit Client" : "Add Client"} onClose={onClose} wide>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(false);
        }}
        className="space-y-4"
      >
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>
        )}

        {duplicate && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm px-3 py-2 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p>
                A possible duplicate exists: <strong>{duplicate.name}</strong>. Same phone or email is already in
                the system.
              </p>
              <button
                type="button"
                onClick={() => submit(true)}
                className="btn-secondary mt-2 text-xs py-1"
              >
                Create anyway
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Client name *</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="label">Lead source</label>
            <select className="input" value={leadSource} onChange={(e) => setLeadSource(e.target.value as typeof leadSource)}>
              {LEAD_SOURCES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">WhatsApp / phone number</label>
            <input
              className="input"
              placeholder="+1 415 555 2671"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            {phone.trim() && (
              <p className={`text-xs mt-1 flex items-center gap-1 ${phonePreview?.valid ? "text-emerald-600" : "text-red-500"}`}>
                {phonePreview?.valid ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                {phonePreview?.valid
                  ? `${phonePreview.e164} · ${phonePreview.countryName}`
                  : phonePreview?.error ?? "Enter in international format"}
              </p>
            )}
          </div>
          <div>
            <label className="label">Email address</label>
            <input
              type="email"
              className="input"
              placeholder="client@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        {phonePreview?.valid && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 space-y-2">
            <p className="text-xs font-medium text-slate-600 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" /> Timezone detection
            </p>
            {needsManualSelection ? (
              <p className="text-xs text-amber-700">
                {phonePreview.countryName} spans multiple timezones — pick the client&apos;s timezone manually.
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                Auto-detected: <strong>{detection?.timezone ?? "Needs confirmation"}</strong>
              </p>
            )}
            <div>
              <label className="label">Timezone {needsManualSelection ? "(required)" : "(override)"}</label>
              <select
                className="input"
                value={manualTimezone}
                onChange={(e) => setManualTimezone(e.target.value)}
              >
                <option value="">
                  {detection?.confident ? `Use auto-detected (${detection.timezone})` : "Select timezone…"}
                </option>
                {candidateTimezones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                A manually selected timezone always overrides auto-detection.
              </p>
            </div>
          </div>
        )}

        <div>
          <label className="label">Client requirement</label>
          <input
            className="input"
            placeholder="e.g. IB Physics HL tutoring"
            value={requirement}
            onChange={(e) => setRequirement(e.target.value)}
          />
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div>
          <label className="label">Assigned salesperson</label>
          <select className="input" value={assignedUserId} onChange={(e) => setAssignedUserId(e.target.value)}>
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? "Save changes" : "Add client"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
