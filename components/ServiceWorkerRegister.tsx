"use client";

import { useEffect } from "react";

/**
 * Registers the PWA service worker. A tiny client component instead of
 * inline script so it plays nicely with the app router's server-rendered
 * root layout — the actual registration only ever needs to run once,
 * client-side, after hydration.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    // Service workers require a secure context (https, or localhost for dev).
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Non-fatal — the app works fine without it, just without offline/installability.
    });
  }, []);

  return null;
}
