import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { paymentSchema } from "@/lib/validation";
import { logActivity } from "@/lib/activityLog";
import { serializeClient } from "@/lib/serialize";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: "Your session has expired. Please refresh the page and log in again." }, { status: 401 });
  }

  const client = await prisma.client.findUnique({ where: { id: params.id } });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  if (client.status !== "CONVERTED") {
    return NextResponse.json({ error: "Only converted clients can have payments recorded" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = paymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  const revenue = Number(client.totalRevenue ?? 0);
  const currentReceived = Number(client.amountReceived ?? 0);
  const newTotal = currentReceived + data.amount;

  if (!data.allowOverpayment && newTotal > revenue) {
    return NextResponse.json(
      { error: `This payment would bring total received (${newTotal}) above revenue (${revenue}). Confirm to allow overpayment.` },
      { status: 400 }
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        clientId: client.id,
        amount: data.amount,
        paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
        method: data.method || null,
        reference: data.reference || null,
        notes: data.notes || null,
      },
    });

    const client2 = await tx.client.update({
      where: { id: client.id },
      data: { amountReceived: newTotal },
    });

    await logActivity(tx, {
      clientId: client.id,
      type: "PAYMENT_RECORDED",
      message: `Payment recorded: ${data.amount}${data.method ? ` via ${data.method}` : ""}`,
      actorId: session.userId,
    });

    return client2;
  });

  const full = await prisma.client.findUnique({
    where: { id: updated.id },
    include: { payments: { orderBy: { paidAt: "desc" } } },
  });

  return NextResponse.json({ client: serializeClient(full) });
}
