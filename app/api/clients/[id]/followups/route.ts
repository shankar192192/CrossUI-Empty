import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { followUpSchema } from "@/lib/validation";
import { computeScheduledAt } from "@/lib/followups";
import { logActivity } from "@/lib/activityLog";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const client = await prisma.client.findUnique({ where: { id: params.id } });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  if (!client.timezone) {
    return NextResponse.json(
      { error: "This client's timezone needs confirmation before scheduling a follow-up. Set a timezone first." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = followUpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  const scheduledAt = computeScheduledAt(data.localDate, data.localTime, client.timezone);

  const followUp = await prisma.$transaction(async (tx) => {
    const created = await tx.followUp.create({
      data: {
        clientId: client.id,
        localDate: data.localDate,
        localTime: data.localTime,
        timezone: client.timezone!,
        scheduledAt,
        note: data.note || null,
        assignedUserId: data.assignedUserId || null,
        status: "PENDING",
      },
    });

    if (client.status !== "FOLLOW_UP" && client.status !== "CONVERTED" && client.status !== "LOST") {
      await tx.client.update({ where: { id: client.id }, data: { status: "FOLLOW_UP" } });
    }

    await logActivity(tx, {
      clientId: client.id,
      type: "FOLLOW_UP_SCHEDULED",
      message: `Follow-up scheduled for ${data.localTime} on ${data.localDate} (${client.timezone})`,
      actorId: session.userId,
    });

    return created;
  });

  return NextResponse.json({ followUp }, { status: 201 });
}
