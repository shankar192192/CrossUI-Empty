"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { Loader2 } from "lucide-react";
import type { Client, FollowUp } from "@/lib/types";

export function ScheduleFollowUpModal({
  client,
  onClose,
  onScheduled,
}: {
  client: Client;
  onClose: () => void;
  onScheduled: (followUp: FollowUp) => void;
}) {
  const [localDate, setLocalDate] = useState(new Date().toISOString().slice(0, 10));
  const [localTime, setLocalTime] = useState("12:00");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/clients/${client.id}/followups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ localDate, localTime, note: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setSubmitting(false);
        return;
      }
      onScheduled(data.followUp);
    } catch {
      setError("Network error — please try again");
      setSubmitting(false);
    }
  }

  if (!client.timezone) {
    return (
      <Modal title="Schedule Follow-up" onClose={onClose}>
        <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm px-3 py-2">
          This client&apos;s timezone needs confirmation before a follow-up can be scheduled. Edit the client and set a
          timezone first.
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`Schedule Follow-up — ${client.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>
        )}
        <p className="text-xs text-slate-500">
          Time is interpreted in the client&apos;s local timezone: <strong>{client.timezone}</strong>
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Date</label>
            <input type="date" required className="input" value={localDate} onChange={(e) => setLocalDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Time (client&apos;s local time)</label>
            <input type="time" required className="input" value={localTime} onChange={(e) => setLocalTime(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Note</label>
          <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Schedule
          </button>
        </div>
      </form>
    </Modal>
  );
}
