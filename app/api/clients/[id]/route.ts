import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { updateClientSchema } from "@/lib/validation";
import { resolveClientIdentity } from "@/lib/clientResolution";
import { logActivity } from "@/lib/activityLog";
import { serializeClient } from "@/lib/serialize";
import { computeNextDayFollowUp, recomputeFollowUpForTimezoneChange } from "@/lib/followups";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: "Your session has expired. Please refresh the page and log in again." }, { status: 401 });
  }

  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      leadSource: true,
      payments: { orderBy: { paidAt: "desc" } },
      followUpLogs: { orderBy: { occurredAt: "desc" } },
      activities: { orderBy: { occurredAt: "desc" }, include: { actor: { select: { id: true, name: true } } } },
    },
  });

  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  return NextResponse.json({ client: serializeClient(client) });
}

const STATUS_LABEL: Record<string, string> = {
  NEW_LEAD: "New Lead",
  DEMO_SCHEDULED: "Demo Scheduled",
  FOLLOW_UP: "Follow-up",
  CONVERTED: "Converted",
  LOST: "Lost",
};

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: "Your session has expired. Please refresh the page and log in again." }, { status: 401 });
  }

  const existing = await prisma.client.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = updateClientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  const update: Record<string, unknown> = {};
  const activities: { type: import("@prisma/client").ActivityType; message: string; metadata?: Record<string, unknown> }[] = [];

  if (data.name !== undefined) update.name = data.name;

  if (data.phone !== undefined || data.manualTimezone !== undefined) {
    const phone = data.phone !== undefined ? data.phone : existing.phone ?? undefined;
    const manualTimezone = data.manualTimezone !== undefined ? data.manualTimezone : undefined;

    if (data.phone !== undefined || data.manualTimezone) {
      const identity = resolveClientIdentity({ phone, manualTimezone });
      if (phone && !identity.phoneE164 && identity.phoneError) {
        return NextResponse.json({ error: identity.phoneError }, { status: 400 });
      }
      update.phone = identity.phoneE164;
      update.country = identity.country;
      update.countryName = identity.countryName;

      const tzChanged = identity.timezone !== existing.timezone;
      update.timezone = identity.timezone;
      update.timezoneSource = identity.timezoneSource;
      update.timezoneConfident = identity.timezoneConfident;

      if (tzChanged && identity.timezone) {
        activities.push({
          type: "TIMEZONE_UPDATED",
          message: `Timezone set to ${identity.timezone} (${identity.timezoneSource === "MANUAL" ? "manual override" : "auto-detected"})`,
        });
      }

      // Recompute on every edit that touches phone/timezone, not just when
      // the resolved value textually changes — a follow-up slot computed
      // under a stale/incorrect timezone earlier stays wrong forever
      // otherwise, even after the timezone is "corrected" to the same
      // value it already displayed (e.g. re-confirming an already-correct
      // manual override does nothing to a value that was miscomputed at
      // creation time, unless we always self-heal here).
      if (
        identity.timezone &&
        existing.nextFollowUpAt &&
        (existing.status === "NEW_LEAD" || existing.status === "FOLLOW_UP")
      ) {
        update.nextFollowUpAt = recomputeFollowUpForTimezoneChange(existing.nextFollowUpAt, identity.timezone);
      }
    }
  }

  if (data.email !== undefined) update.email = data.email ? data.email.toLowerCase().trim() : null;

  if (data.requirement !== undefined) {
    update.requirement = data.requirement || null;
    if (data.requirement && data.requirement !== existing.requirement) {
      activities.push({ type: "REQUIREMENT_UPDATED", message: `Requirement updated: ${data.requirement}` });
    }
  }

  if (data.notes !== undefined) {
    update.notes = data.notes || null;
    if (data.notes) activities.push({ type: "NOTE", message: data.notes });
  }

  if (data.leadSourceId !== undefined) update.leadSourceId = data.leadSourceId || null;
  if (data.totalRevenue !== undefined) update.totalRevenue = data.totalRevenue;
  if (data.totalCost !== undefined) update.totalCost = data.totalCost;
  if (data.paymentDueDate !== undefined) update.paymentDueDate = data.paymentDueDate ? new Date(data.paymentDueDate) : null;

  let autoFollowUpAt: Date | null = null;

  if (data.status !== undefined && data.status !== existing.status) {
    update.status = data.status;
    activities.push({
      type: "STATUS_CHANGED",
      message: `Status changed from ${STATUS_LABEL[existing.status]} to ${STATUS_LABEL[data.status]}`,
      metadata: { from: existing.status, to: data.status },
    });

    if (data.status === "LOST") {
      update.lostAt = new Date();
      update.lostReason = data.lostReason || null;
    }

    if (data.status === "FOLLOW_UP" && !existing.nextFollowUpAt) {
      const tz = (update.timezone as string | null | undefined) ?? existing.timezone;
      autoFollowUpAt = computeNextDayFollowUp(tz);
      update.nextFollowUpAt = autoFollowUpAt;
    }
  }

  if (data.lostReason !== undefined && data.status === undefined) {
    update.lostReason = data.lostReason || null;
  }

  const client = await prisma.$transaction(async (tx) => {
    const updated = await tx.client.update({ where: { id: params.id }, data: update as Prisma.ClientUpdateInput });

    for (const a of activities) {
      await logActivity(tx, { clientId: updated.id, type: a.type, message: a.message, actorId: session.userId, metadata: a.metadata });
    }

    if (autoFollowUpAt) {
      await logActivity(tx, {
        clientId: updated.id,
        type: "FOLLOW_UP_SCHEDULED",
        message: `Follow-up scheduled for tomorrow`,
        actorId: session.userId,
      });
    }

    return updated;
  });

  const full = await prisma.client.findUnique({
    where: { id: client.id },
    include: {
      leadSource: true,
      payments: { orderBy: { paidAt: "desc" } },
      followUpLogs: { orderBy: { occurredAt: "desc" } },
      activities: { orderBy: { occurredAt: "desc" } },
    },
  });

  return NextResponse.json({ client: serializeClient(full) });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    if (session.role !== "ADMIN") {
      return NextResponse.json({ error: "Only admins can delete clients" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Your session has expired. Please refresh the page and log in again." }, { status: 401 });
  }

  await prisma.client.delete({ where: { id: params.id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
