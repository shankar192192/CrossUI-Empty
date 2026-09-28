import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { scheduleDemoSchema } from "@/lib/validation";
import { computeScheduledAt, DEMO_TIMEZONE } from "@/lib/followups";
import { logActivity } from "@/lib/activityLog";
import { serializeClient } from "@/lib/serialize";

// Demos are always scheduled by the operator directly in their own
// timezone (IST) — there's no client-timezone conversion here.
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
  const parsed = scheduleDemoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  const demoAt = computeScheduledAt(data.localDate, data.localTime, DEMO_TIMEZONE);

  const updated = await prisma.$transaction(async (tx) => {
    const c = await tx.client.update({
      where: { id: client.id },
      data: { status: "DEMO_SCHEDULED", demoAt },
    });

    await logActivity(tx, {
      clientId: client.id,
      type: "DEMO_SCHEDULED",
      message: `Demo scheduled for ${data.localTime} on ${data.localDate} (IST)${data.note ? ` — ${data.note}` : ""}`,
      actorId: session.userId,
    });

    return c;
  });

  const full = await prisma.client.findUnique({ where: { id: updated.id }, include: { leadSource: true } });
  return NextResponse.json({ client: serializeClient(full) });
}
