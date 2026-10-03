import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToAll } from "@/lib/push";
import { formatInIST } from "@/lib/followups";

// Called every 5 minutes by an external scheduler (cron-job.org) rather
// than Vercel's own cron, since Vercel's free tier only runs cron jobs
// once a day — nowhere near frequent enough for a "30 minutes before"
// reminder. GitHub Actions' own `schedule` trigger was tried first but
// proved unreliable (never fired on its own even once in over an hour of
// waiting — see .github/workflows/demo-reminders.yml, kept around now
// only as a manual-trigger debugging tool).
//
// Window is wider than exactly 30 minutes (25–40) so a scheduler run that
// lands a few minutes late still catches every demo before its reminder
// window closes. demoReminderSentAt dedupes so a demo already caught by
// an earlier run never gets a second push.
const WINDOW_START_MINUTES = 25;
const WINDOW_END_MINUTES = 40;

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() + WINDOW_START_MINUTES * 60_000);
  const windowEnd = new Date(now.getTime() + WINDOW_END_MINUTES * 60_000);

  const dueClients = await prisma.client.findMany({
    where: {
      status: "DEMO_SCHEDULED",
      demoAt: { gte: windowStart, lte: windowEnd },
      demoReminderSentAt: null,
    },
    select: { id: true, name: true, demoAt: true },
  });

  let notified = 0;
  const pushResults = [];
  for (const client of dueClients) {
    if (!client.demoAt) continue;
    const result = await sendPushToAll({
      title: "Demo in 30 minutes",
      body: `${client.name} — call at ${formatInIST(client.demoAt)} IST`,
      url: `/clients/${client.id}`,
    });
    pushResults.push({ clientId: client.id, clientName: client.name, ...result });
    await prisma.client.update({ where: { id: client.id }, data: { demoReminderSentAt: now } });
    notified++;
  }

  const subscriptionCount = await prisma.pushSubscription.count();

  return NextResponse.json({ checked: dueClients.length, notified, subscriptionCount, pushResults });
}
