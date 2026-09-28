import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { serializeClient } from "@/lib/serialize";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const status = sp.get("status") ?? "PENDING";
  const assignedUserId = sp.get("assignedUserId");

  const where: Prisma.FollowUpWhereInput = {};
  if (status !== "ALL") where.status = status as Prisma.EnumFollowUpStatusFilter["equals"];
  if (assignedUserId) where.assignedUserId = assignedUserId;

  const followUps = await prisma.followUp.findMany({
    where,
    orderBy: { scheduledAt: "asc" },
    include: {
      client: true,
      assignedUser: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    followUps: followUps.map((f) => ({ ...f, client: serializeClient(f.client)! })),
  });
}
