import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { computeNextDayFollowUp } from "@/lib/followups";
import { logActivity } from "@/lib/activityLog";
import { serializeClient } from "@/lib/serialize";

// Marking a demo done always moves the client into Follow-up, flagged as
// priority, with a follow-up automatically scheduled for tomorrow.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const client = await prisma.client.findUnique({ where: { id: params.id } });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const nextFollowUpAt = computeNextDayFollowUp(client.timezone);

  const updated = await prisma.$transaction(async (tx) => {
    const c = await tx.client.update({
      where: { id: client.id },
      data: { status: "FOLLOW_UP", followUpPriority: true, nextFollowUpAt },
    });

    await tx.followUpLog.create({
      data: { clientId: client.id, outcome: "DEMO_COMPLETED", nextFollowUpAt },
    });

    await logActivity(tx, {
      clientId: client.id,
      type: "DEMO_COMPLETED",
      message: `Demo completed — moved to Follow-up (priority), next follow-up scheduled for tomorrow`,
      actorId: session.userId,
    });

    return c;
  });

  const full = await prisma.client.findUnique({ where: { id: updated.id }, include: { leadSource: true } });
  return NextResponse.json({ client: serializeClient(full) });
}
