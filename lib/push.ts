import webpush from "web-push";
import { prisma } from "./prisma";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@prepseven.com";
  if (!publicKey || !privateKey) {
    throw new Error("VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY environment variables are not set");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
}

/**
 * Sends a push notification to every subscribed device. A subscription
 * that the push service reports as gone (404/410 — user revoked
 * permission, uninstalled, etc.) is deleted so it's never retried.
 */
export async function sendPushToAll(payload: PushPayload) {
  ensureConfigured();

  const subscriptions = await prisma.pushSubscription.findMany();
  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload)
      )
    )
  );

  const deadEndpoints: string[] = [];
  const errors: { statusCode?: number; message: string }[] = [];
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      const reason = result.reason as { statusCode?: number; message?: string; body?: string };
      errors.push({ statusCode: reason?.statusCode, message: reason?.message ?? reason?.body ?? String(result.reason) });
      if (reason?.statusCode === 404 || reason?.statusCode === 410) {
        deadEndpoints.push(subscriptions[i].endpoint);
      }
    }
  });

  if (deadEndpoints.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: deadEndpoints } } });
  }

  return {
    subscriptionCount: subscriptions.length,
    sent: results.filter((r) => r.status === "fulfilled").length,
    failed: results.filter((r) => r.status === "rejected").length - deadEndpoints.length,
    removed: deadEndpoints.length,
    errors,
  };
}
