import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { serializeClient } from "@/lib/serialize";
import { calculateProfit, calculatePendingPayment, determinePaymentStatus } from "@/lib/calculations";
import { todayInTimezone } from "@/lib/followups";

export async function GET() {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const now = new Date();

  const [
    totalLeads,
    newLeads,
    demoScheduled,
    followUpStatusCount,
    converted,
    lost,
    dueFollowUps,
    convertedClients,
    recentLeads,
  ] = await Promise.all([
    prisma.client.count(),
    prisma.client.count({ where: { status: "NEW_LEAD" } }),
    prisma.client.count({ where: { status: "DEMO_SCHEDULED" } }),
    prisma.client.count({ where: { status: "FOLLOW_UP" } }),
    prisma.client.count({ where: { status: "CONVERTED" } }),
    prisma.client.count({ where: { status: "LOST" } }),
    prisma.followUp.count({ where: { status: "PENDING", scheduledAt: { lte: now } } }),
    prisma.client.findMany({ where: { status: "CONVERTED" }, select: { totalRevenue: true, totalCost: true, amountReceived: true, paymentDueDate: true } }),
    prisma.client.findMany({
      orderBy: { dateAdded: "desc" },
      take: 10,
      include: { followUps: { where: { status: "PENDING" }, orderBy: { scheduledAt: "asc" }, take: 1 } },
    }),
  ]);

  let totalRevenue = 0;
  let totalCost = 0;
  let totalReceived = 0;
  let pendingPaymentsTotal = 0;
  let overdueCount = 0;

  for (const c of convertedClients) {
    const revenue = Number(c.totalRevenue ?? 0);
    const cost = Number(c.totalCost ?? 0);
    const received = Number(c.amountReceived ?? 0);
    totalRevenue += revenue;
    totalCost += cost;
    totalReceived += received;
    pendingPaymentsTotal += calculatePendingPayment(revenue, received);

    const status = determinePaymentStatus({ revenue, amountReceived: received, dueDate: c.paymentDueDate, now });
    if (status === "OVERDUE") overdueCount++;
  }

  const todaysFollowUps = await prisma.followUp.findMany({
    where: { status: "PENDING" },
    orderBy: { scheduledAt: "asc" },
    include: {
      client: true,
      assignedUser: { select: { id: true, name: true } },
    },
  });

  // "Due today" per client-local-calendar-day, not server-local-day.
  const dueTodayList = todaysFollowUps.filter((f) => {
    if (!f.client.timezone) return false;
    return f.localDate === todayInTimezone(f.client.timezone, now);
  });

  return NextResponse.json({
    metrics: {
      totalLeads,
      newLeads,
      demoScheduled,
      followUpStatusCount,
      followUpsDueToday: dueTodayList.length,
      followUpsDueNow: dueFollowUps,
      converted,
      lost,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalProfit: calculateProfit(totalRevenue, totalCost),
      totalReceived: Math.round(totalReceived * 100) / 100,
      pendingPayments: Math.round(pendingPaymentsTotal * 100) / 100,
      overduePayments: overdueCount,
    },
    todaysFollowUps: dueTodayList.map((f) => ({
      ...f,
      client: serializeClient(f.client)!,
    })),
    recentLeads: recentLeads.map((c) => serializeClient(c)!),
  });
}
