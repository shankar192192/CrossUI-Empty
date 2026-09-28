"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { Loader2, AlertTriangle } from "lucide-react";

export function ConfirmDeleteModal({
  title,
  message,
  confirmLabel = "Delete",
  onClose,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong — please try again");
      setBusy(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>
        )}
        <div className="flex items-start gap-2 text-sm text-slate-600">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
          <p>{message}</p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary" disabled={busy}>
            Cancel
          </button>
          <button type="button" onClick={handleConfirm} disabled={busy} className="btn-danger">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
