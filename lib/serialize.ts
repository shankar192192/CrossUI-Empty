import { Prisma } from "@prisma/client";
import { calculateProfit, calculatePendingPayment, determinePaymentStatus } from "./calculations";

function num(d: Prisma.Decimal | null | undefined): number | null {
  if (d === null || d === undefined) return null;
  return Number(d);
}

export function serializeClient(client: Record<string, unknown> | null) {
  if (!client) return null;
  const revenue = num(client.totalRevenue as Prisma.Decimal | null | undefined);
  const cost = num(client.totalCost as Prisma.Decimal | null | undefined);
  const amountReceived = num(client.amountReceived as Prisma.Decimal | null | undefined) ?? 0;

  const profit = revenue !== null && cost !== null ? calculateProfit(revenue, cost) : null;
  const pendingPayment = revenue !== null ? calculatePendingPayment(revenue, amountReceived) : null;
  const paymentStatus =
    client.status === "CONVERTED" && revenue !== null
      ? determinePaymentStatus({
          revenue,
          amountReceived,
          dueDate: (client.paymentDueDate as Date | null) ?? null,
        })
      : null;

  const payments = client.payments as Record<string, unknown>[] | undefined;

  return {
    ...client,
    totalRevenue: revenue,
    totalCost: cost,
    amountReceived,
    profit,
    pendingPayment,
    paymentStatus,
    payments: payments?.map(serializePayment),
  };
}

export function serializePayment(payment: Record<string, unknown>) {
  return { ...payment, amount: num(payment.amount as Prisma.Decimal | null | undefined) };
}
