"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { Loader2 } from "lucide-react";
import type { Client } from "@/lib/types";

export function PaymentModal({
  client,
  onClose,
  onRecorded,
}: {
  client: Client;
  onClose: () => void;
  onRecorded: (client: Client) => void;
}) {
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [allowOverpayment, setAllowOverpayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError("Enter a valid payment amount");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/clients/${client.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amt,
          paidAt,
          method: method || undefined,
          reference: reference || undefined,
          notes: notes || undefined,
          allowOverpayment,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setSubmitting(false);
        return;
      }
      onRecorded(data.client);
    } catch {
      setError("Network error — please try again");
      setSubmitting(false);
    }
  }

  const pending = client.pendingPayment ?? 0;

  return (
    <Modal title={`Record Payment — ${client.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
            {error}
            <label className="flex items-center gap-2 mt-2 text-xs">
              <input type="checkbox" checked={allowOverpayment} onChange={(e) => setAllowOverpayment(e.target.checked)} />
              Allow this payment to exceed revenue
            </label>
          </div>
        )}
        <p className="text-xs text-slate-500">Pending payment: <strong>{pending}</strong></p>
        <div>
          <label className="label">Amount *</label>
          <input type="number" min={0.01} step="0.01" required className="input" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Date received</label>
            <input type="date" className="input" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
          </div>
          <div>
            <label className="label">Method</label>
            <input className="input" placeholder="Bank transfer, UPI…" value={method} onChange={(e) => setMethod(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Reference</label>
          <input className="input" value={reference} onChange={(e) => setReference(e.target.value)} />
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Record payment
          </button>
        </div>
      </form>
    </Modal>
  );
}
