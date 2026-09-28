import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { followUpUpdateSchema } from "@/lib/validation";
import { computeScheduledAt } from "@/lib/followups";
import { logActivity } from "@/lib/activityLog";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const existing = await prisma.followUp.findUnique({ where: { id: params.id }, include: { client: true } });
  if (!existing) return NextResponse.json({ error: "Follow-up not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = followUpUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  const result = await prisma.$transaction(async (tx) => {
    // Rescheduling: close this one out and create a fresh PENDING follow-up
    // so the timeline keeps a record of the original slot.
    if (data.localDate || data.localTime) {
      const localDate = data.localDate ?? existing.localDate;
      const localTime = data.localTime ?? existing.localTime;
      const scheduledAt = computeScheduledAt(localDate, localTime, existing.timezone);

      await tx.followUp.update({
        where: { id: existing.id },
        data: { status: "RESCHEDULED" },
      });

      const next = await tx.followUp.create({
        data: {
          clientId: existing.clientId,
          localDate,
          localTime,
          timezone: existing.timezone,
          scheduledAt,
          note: data.note !== undefined ? data.note || null : existing.note,
          assignedUserId: data.assignedUserId !== undefined ? data.assignedUserId || null : existing.assignedUserId,
          status: "PENDING",
          rescheduledFromId: existing.id,
        },
      });

      await logActivity(tx, {
        clientId: existing.clientId,
        type: "FOLLOW_UP_RESCHEDULED",
        message: `Follow-up rescheduled to ${localTime} on ${localDate} (${existing.timezone})`,
        actorId: session.userId,
      });

      return next;
    }

    const update: Record<string, unknown> = {};
    if (data.status) update.status = data.status;
    if (data.note !== undefined) update.note = data.note || null;
    if (data.assignedUserId !== undefined) update.assignedUserId = data.assignedUserId || null;
    if (data.status === "COMPLETED") update.completedAt = new Date();

    const updated = await tx.followUp.update({ where: { id: existing.id }, data: update });

    if (data.status === "COMPLETED") {
      await logActivity(tx, {
        clientId: existing.clientId,
        type: "FOLLOW_UP_COMPLETED",
        message: `Follow-up marked as completed`,
        actorId: session.userId,
      });
    } else if (data.status === "CANCELLED") {
      await logActivity(tx, {
        clientId: existing.clientId,
        type: "FOLLOW_UP_COMPLETED",
        message: `Follow-up cancelled`,
        actorId: session.userId,
      });
    }

    return updated;
  });

  return NextResponse.json({ followUp: result });
}
