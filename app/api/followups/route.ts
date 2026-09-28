import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { serializeClient } from "@/lib/serialize";
import { isDueToday } from "@/lib/followups";

// The daily follow-up list: every client not Demo Scheduled / Converted /
// Lost, whose next follow-up slot has arrived (today or earlier).
export async function GET() {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const clients = await prisma.client.findMany({
    where: {
      status: { in: ["NEW_LEAD", "FOLLOW_UP"] },
      nextFollowUpAt: { not: null },
    },
    orderBy: { nextFollowUpAt: "asc" },
    include: { leadSource: true },
  });

  const due = clients.filter((c) => isDueToday(c.nextFollowUpAt));

  return NextResponse.json({ clients: due.map((c) => serializeClient(c)!) });
}
