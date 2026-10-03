"use client";

import { useMemo, useState } from "react";
import { Modal } from "./Modal";
import { calculateProfit, calculatePendingPayment } from "@/lib/calculations";
import { formatCurrency } from "@/lib/format";
import { Loader2 } from "lucide-react";
import type { Client } from "@/lib/types";

export function ConvertModal({
  client,
  onClose,
  onConverted,
}: {
  client: Client;
  onClose: () => void;
  onConverted: (client: Client) => void;
}) {
  const [revenue, setRevenue] = useState("");
  const [cost, setCost] = useState("0");
  const [amountReceived, setAmountReceived] = useState("0");
  const [paymentDueDate, setPaymentDueDate] = useState("");
  const [productService, setProductService] = useState("");
  const [conversionDate, setConversionDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [allowOverpayment, setAllowOverpayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const revenueNum = parseFloat(revenue) || 0;
  const costNum = parseFloat(cost) || 0;
  const receivedNum = parseFloat(amountReceived) || 0;

  const profit = useMemo(() => calculateProfit(revenueNum, costNum), [revenueNum, costNum]);
  const pending = useMemo(() => calculatePendingPayment(revenueNum, receivedNum), [revenueNum, receivedNum]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (revenueNum < 0 || costNum < 0 || receivedNum < 0) {
      setError("Amounts cannot be negative");
      return;
    }
    if (!allowOverpayment && receivedNum > revenueNum) {
      setError("Amount received cannot exceed revenue (check the box below to allow this)");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/clients/${client.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revenue: revenueNum,
          cost: costNum,
          amountReceived: receivedNum,
          paymentDueDate: paymentDueDate || undefined,
          productService: productService || undefined,
          conversionDate,
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
      onConverted(data.client);
    } catch {
      setError("Network error — please try again");
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Convert ${client.name}`} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Total revenue *</label>
            <input
              type="number"
              min={0}
              step="0.01"
              required
              className="input"
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Total cost</label>
            <input type="number" min={0} step="0.01" className="input" value={cost} onChange={(e) => setCost(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Amount received</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="input"
              value={amountReceived}
              onChange={(e) => setAmountReceived(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Payment due date</label>
            <input type="date" className="input" value={paymentDueDate} onChange={(e) => setPaymentDueDate(e.target.value)} />
          </div>
        </div>

        {receivedNum > revenueNum && revenueNum > 0 && (
          <label className="flex items-center gap-2 text-xs text-amber-700">
            <input type="checkbox" checked={allowOverpayment} onChange={(e) => setAllowOverpayment(e.target.checked)} />
            Amount received exceeds revenue — allow overpayment
          </label>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Product / service purchased</label>
            <input className="input" value={productService} onChange={(e) => setProductService(e.target.value)} />
          </div>
          <div>
            <label className="label">Conversion date</label>
            <input type="date" className="input" value={conversionDate} onChange={(e) => setConversionDate(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-emerald-700 text-xs font-medium">Profit (auto)</p>
            <p className="text-emerald-900 font-semibold">{formatCurrency(profit)}</p>
          </div>
          <div>
            <p className="text-emerald-700 text-xs font-medium">Pending payment (auto)</p>
            <p className="text-emerald-900 font-semibold">{formatCurrency(pending)}</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Convert client
          </button>
        </div>
      </form>
    </Modal>
  );
}
