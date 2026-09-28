import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { calculateProfit, calculatePendingPayment } from "@/lib/calculations";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const dateFrom = sp.get("dateFrom");
  const dateTo = sp.get("dateTo");
  const country = sp.get("country");
  const leadSourceId = sp.get("leadSourceId");

  const where: Prisma.ClientWhereInput = {};
  if (dateFrom || dateTo) {
    where.dateAdded = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo + "T23:59:59") } : {}),
    };
  }
  if (country) where.country = country;
  if (leadSourceId) where.leadSourceId = leadSourceId;

  const clients = await prisma.client.findMany({
    where,
    select: {
      id: true,
      status: true,
      dateAdded: true,
      convertedAt: true,
      country: true,
      countryName: true,
      leadSource: { select: { name: true } },
      totalRevenue: true,
      totalCost: true,
      amountReceived: true,
      demoAt: true,
    },
  });

  const followUpsCount = await prisma.followUpLog.count({
    where: { client: where },
  });

  const leadsGenerated = clients.length;
  const converted = clients.filter((c) => c.status === "CONVERTED").length;
  const demos = clients.filter((c) => c.demoAt !== null).length;
  const conversionRate = leadsGenerated > 0 ? Math.round((converted / leadsGenerated) * 1000) / 10 : 0;

  let revenue = 0;
  let cost = 0;
  let received = 0;
  for (const c of clients) {
    revenue += Number(c.totalRevenue ?? 0);
    cost += Number(c.totalCost ?? 0);
    received += Number(c.amountReceived ?? 0);
  }
  const profit = calculateProfit(revenue, cost);
  const pending = calculatePendingPayment(revenue, received);

  // Breakdown by lead source
  const bySource: Record<string, { leads: number; converted: number; revenue: number }> = {};
  for (const c of clients) {
    const key = c.leadSource?.name ?? "Unassigned";
    bySource[key] ??= { leads: 0, converted: 0, revenue: 0 };
    bySource[key].leads++;
    if (c.status === "CONVERTED") {
      bySource[key].converted++;
      bySource[key].revenue += Number(c.totalRevenue ?? 0);
    }
  }

  // Breakdown by country
  const byCountry: Record<string, { name: string; leads: number; converted: number; revenue: number }> = {};
  for (const c of clients) {
    const key = c.country ?? "Unknown";
    byCountry[key] ??= { name: c.countryName ?? "Unknown", leads: 0, converted: 0, revenue: 0 };
    byCountry[key].leads++;
    if (c.status === "CONVERTED") {
      byCountry[key].converted++;
      byCountry[key].revenue += Number(c.totalRevenue ?? 0);
    }
  }

  // Monthly trend (by dateAdded month)
  const byMonth: Record<string, { leads: number; converted: number; revenue: number }> = {};
  for (const c of clients) {
    const key = c.dateAdded.toISOString().slice(0, 7);
    byMonth[key] ??= { leads: 0, converted: 0, revenue: 0 };
    byMonth[key].leads++;
    if (c.status === "CONVERTED") {
      byMonth[key].converted++;
      byMonth[key].revenue += Number(c.totalRevenue ?? 0);
    }
  }

  return NextResponse.json({
    summary: {
      leadsGenerated,
      converted,
      conversionRate,
      demos,
      followUps: followUpsCount,
      revenue: Math.round(revenue * 100) / 100,
      profit,
      pending,
    },
    bySource,
    byCountry,
    byMonth,
  });
}
