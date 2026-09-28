import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { serializeClient } from "@/lib/serialize";
import { calculateProfit, calculatePendingPayment, determinePaymentStatus } from "@/lib/calculations";
import { isDueToday } from "@/lib/followups";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const now = new Date();
  const sp = req.nextUrl.searchParams;
  const dateFrom = sp.get("dateFrom");
  const dateTo = sp.get("dateTo");

  // The date filter scopes the lead/revenue metrics and "Recent Leads";
  // "Today's Follow-ups" is always the live, current-moment operational list.
  const dateWhere: Prisma.ClientWhereInput =
    dateFrom || dateTo
      ? {
          dateAdded: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo + "T23:59:59") } : {}),
          },
        }
      : {};

  const [
    totalLeads,
    newLeads,
    demoScheduled,
    followUpStatusCount,
    converted,
    lost,
    convertedClients,
    recentLeads,
    dueClients,
  ] = await Promise.all([
    prisma.client.count({ where: dateWhere }),
    prisma.client.count({ where: { ...dateWhere, status: "NEW_LEAD" } }),
    prisma.client.count({ where: { ...dateWhere, status: "DEMO_SCHEDULED" } }),
    prisma.client.count({ where: { ...dateWhere, status: "FOLLOW_UP" } }),
    prisma.client.count({ where: { ...dateWhere, status: "CONVERTED" } }),
    prisma.client.count({ where: { ...dateWhere, status: "LOST" } }),
    prisma.client.findMany({
      where: { ...dateWhere, status: "CONVERTED" },
      select: { totalRevenue: true, totalCost: true, amountReceived: true, paymentDueDate: true },
    }),
    prisma.client.findMany({
      where: dateWhere,
      orderBy: { dateAdded: "desc" },
      take: 10,
      include: { leadSource: true },
    }),
    prisma.client.findMany({
      where: { status: { in: ["NEW_LEAD", "FOLLOW_UP"] }, nextFollowUpAt: { not: null } },
      orderBy: { nextFollowUpAt: "asc" },
      include: { leadSource: true },
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

  const dueTodayList = dueClients.filter((c) => isDueToday(c.nextFollowUpAt));

  return NextResponse.json({
    metrics: {
      totalLeads,
      newLeads,
      demoScheduled,
      followUpStatusCount,
      followUpsDueToday: dueTodayList.length,
      converted,
      lost,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalProfit: calculateProfit(totalRevenue, totalCost),
      totalReceived: Math.round(totalReceived * 100) / 100,
      pendingPayments: Math.round(pendingPaymentsTotal * 100) / 100,
      overduePayments: overdueCount,
    },
    todaysFollowUps: dueTodayList.map((c) => serializeClient(c)!),
    recentLeads: recentLeads.map((c) => serializeClient(c)!),
  });
}
