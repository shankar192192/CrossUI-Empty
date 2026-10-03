"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { Loader2 } from "lucide-react";
import type { Client } from "@/lib/types";

export function SetFollowUpDateModal({
  client,
  onClose,
  onDone,
}: {
  client: Client;
  onClose: () => void;
  onDone: (client: Client) => void;
}) {
  const [date, setDate] = useState(new Date(Date.now() + 86_400_000).toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${client.id}/followup-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "specific_date", date, note: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setSubmitting(false);
        return;
      }
      onDone(data.client);
    } catch {
      setError("Network error — please try again");
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Set Follow-up Date — ${client.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>
        )}
        <p className="text-xs text-slate-500">
          They won&apos;t appear in your daily follow-up list again until this date. Call slot is always 1:00 PM in
          their local time{client.timezone ? ` (${client.timezone})` : " (IST, until their timezone is confirmed)"}.
        </p>
        <div>
          <label className="label">Follow-up date</label>
          <input
            type="date"
            required
            min={new Date().toISOString().slice(0, 10)}
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
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
            Set date
          </button>
        </div>
      </form>
    </Modal>
  );
}
