import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { followUpActionSchema } from "@/lib/validation";
import { computeNextDayFollowUp, computeFollowUpForDate } from "@/lib/followups";
import { logActivity } from "@/lib/activityLog";
import { serializeClient } from "@/lib/serialize";

// The single daily action taken on a client from the follow-up list:
// push to tomorrow, pick a specific future date, or mark lost.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: "Your session has expired. Please refresh the page and log in again." }, { status: 401 });
  }

  const client = await prisma.client.findUnique({ where: { id: params.id } });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = followUpActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  const updated = await prisma.$transaction(async (tx) => {
    if (data.action === "lost") {
      const c = await tx.client.update({
        where: { id: client.id },
        data: { status: "LOST", lostAt: new Date(), lostReason: data.lostReason || null, nextFollowUpAt: null, followUpPriority: false },
      });
      await tx.followUpLog.create({ data: { clientId: client.id, outcome: "LOST", note: data.lostReason || null } });
      await logActivity(tx, {
        clientId: client.id,
        type: "STATUS_CHANGED",
        message: `Status changed to Lost${data.lostReason ? ` — ${data.lostReason}` : ""}`,
        actorId: session.userId,
      });
      return c;
    }

    const nextFollowUpAt =
      data.action === "tomorrow" ? computeNextDayFollowUp(client.timezone) : computeFollowUpForDate(data.date, client.timezone);

    const c = await tx.client.update({
      where: { id: client.id },
      data: { status: "FOLLOW_UP", followUpPriority: false, nextFollowUpAt },
    });

    await tx.followUpLog.create({
      data: {
        clientId: client.id,
        outcome: data.action === "tomorrow" ? "FOLLOWED_UP_NEXT_DAY" : "FOLLOWED_UP_SPECIFIC_DATE",
        note: data.note || null,
        nextFollowUpAt,
      },
    });

    await logActivity(tx, {
      clientId: client.id,
      type: "FOLLOW_UP_LOGGED",
      message:
        data.action === "tomorrow"
          ? "Followed up — next follow-up scheduled for tomorrow"
          : `Followed up — next follow-up scheduled for ${data.date}`,
      actorId: session.userId,
    });

    return c;
  });

  const full = await prisma.client.findUnique({ where: { id: updated.id }, include: { leadSource: true } });
  return NextResponse.json({ client: serializeClient(full) });
}
