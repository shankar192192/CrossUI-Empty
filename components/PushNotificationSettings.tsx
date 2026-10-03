"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";

type Status = "checking" | "unsupported" | "denied" | "subscribed" | "not-subscribed";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function PushNotificationSettings() {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setStatus(sub ? "subscribed" : "not-subscribed");
    } catch {
      setStatus("not-subscribed");
    }
  }

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "not-subscribed");
        setBusy(false);
        return;
      }

      const publicKeyRes = await fetch("/api/push/public-key").then((r) => r.json());
      if (!publicKeyRes.publicKey) throw new Error("Push notifications aren't configured on the server yet.");

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKeyRes.publicKey),
      });

      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to save subscription");

      setStatus("subscribed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("not-subscribed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold text-slate-900 mb-1">Demo reminders</h2>
      <p className="text-sm text-slate-500 mb-3">
        Get a push notification on this device 30 minutes before a scheduled demo.
      </p>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 mb-3">{error}</div>}

      {status === "checking" && <p className="text-sm text-slate-400">Checking…</p>}

      {status === "unsupported" && (
        <p className="text-sm text-slate-400">Your browser doesn&apos;t support push notifications.</p>
      )}

      {status === "denied" && (
        <p className="text-sm text-amber-600">
          Notifications are blocked for this site in your browser settings. Enable them there, then reload this page.
        </p>
      )}

      {status === "not-subscribed" && (
        <button onClick={enable} disabled={busy} className="btn-primary">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
          Enable on this device
        </button>
      )}

      {status === "subscribed" && (
        <div className="flex items-center gap-3">
          <span className="badge bg-emerald-50 text-emerald-700">
            <Bell className="w-3 h-3" /> Enabled on this device
          </span>
          <button onClick={disable} disabled={busy} className="btn-ghost text-sm">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BellOff className="w-3.5 h-3.5" />}
            Turn off
          </button>
        </div>
      )}
    </div>
  );
}
