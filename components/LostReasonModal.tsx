"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { Loader2 } from "lucide-react";
import type { Client } from "@/lib/types";

export function LostReasonModal({
  client,
  onClose,
  onDone,
}: {
  client: Client;
  onClose: () => void;
  onDone: (client: Client) => void;
}) {
  const [reason, setReason] = useState("");
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
        body: JSON.stringify({ action: "lost", lostReason: reason || undefined }),
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
    <Modal title={`Mark ${client.name} as Lost`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>
        )}
        <div>
          <label className="label">Reason (optional)</label>
          <textarea
            className="input"
            rows={3}
            placeholder="e.g. Chose a local tutor, unresponsive, too expensive…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn-danger">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Mark Lost
          </button>
        </div>
      </form>
    </Modal>
  );
}
