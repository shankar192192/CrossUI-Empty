import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { conversionSchema } from "@/lib/validation";
import { logActivity } from "@/lib/activityLog";
import { serializeClient } from "@/lib/serialize";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const client = await prisma.client.findUnique({ where: { id: params.id } });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = conversionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;
  const conversionDate = data.conversionDate ? new Date(data.conversionDate) : new Date();

  const updated = await prisma.$transaction(async (tx) => {
    const client2 = await tx.client.update({
      where: { id: client.id },
      data: {
        status: "CONVERTED",
        convertedAt: conversionDate,
        productService: data.productService || null,
        totalRevenue: data.revenue,
        totalCost: data.cost,
        amountReceived: data.amountReceived,
        paymentDueDate: data.paymentDueDate ? new Date(data.paymentDueDate) : null,
        conversionNotes: data.notes || null,
      },
    });

    await logActivity(tx, {
      clientId: client.id,
      type: "CONVERTED",
      message: `Client converted${data.productService ? ` — ${data.productService}` : ""}. Revenue recorded: ${data.revenue}`,
      actorId: session.userId,
      metadata: { revenue: data.revenue, cost: data.cost, amountReceived: data.amountReceived },
    });

    if (data.amountReceived > 0) {
      await tx.payment.create({
        data: {
          clientId: client.id,
          amount: data.amountReceived,
          paidAt: conversionDate,
          notes: "Initial payment recorded at conversion",
        },
      });
      await logActivity(tx, {
        clientId: client.id,
        type: "PAYMENT_RECORDED",
        message: `Payment recorded: ${data.amountReceived}`,
        actorId: session.userId,
      });
    }

    return client2;
  });

  const full = await prisma.client.findUnique({
    where: { id: updated.id },
    include: {
      followUps: { orderBy: { scheduledAt: "desc" } },
      payments: { orderBy: { paidAt: "desc" } },
      activities: { orderBy: { occurredAt: "desc" } },
    },
  });

  return NextResponse.json({ client: serializeClient(full) });
}
