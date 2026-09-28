"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { Loader2 } from "lucide-react";
import type { FollowUp } from "@/lib/types";

export function RescheduleModal({
  followUp,
  clientTimezone,
  onClose,
  onRescheduled,
}: {
  followUp: FollowUp;
  clientTimezone: string;
  onClose: () => void;
  onRescheduled: (followUp: FollowUp) => void;
}) {
  const [localDate, setLocalDate] = useState(followUp.localDate);
  const [localTime, setLocalTime] = useState(followUp.localTime);
  const [note, setNote] = useState(followUp.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/followups/${followUp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ localDate, localTime, note: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setSubmitting(false);
        return;
      }
      onRescheduled(data.followUp);
    } catch {
      setError("Network error — please try again");
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Reschedule Follow-up" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>
        )}
        <p className="text-xs text-slate-500">
          Time is interpreted in the client&apos;s local timezone: <strong>{clientTimezone}</strong>
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
            Reschedule
          </button>
        </div>
      </form>
    </Modal>
  );
}
