export type PaymentStatus = "PENDING" | "PARTIALLY_PAID" | "PAID" | "OVERDUE";

/** Profit = Revenue - Cost. Never computed by hand in the app. */
export function calculateProfit(revenue: number, cost: number): number {
  return round2(revenue - cost);
}

/** Pending Payment = Revenue - Amount Received. */
export function calculatePendingPayment(revenue: number, amountReceived: number): number {
  return round2(Math.max(0, revenue - amountReceived));
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function determinePaymentStatus(params: {
  revenue: number;
  amountReceived: number;
  dueDate: Date | null;
  now?: Date;
}): PaymentStatus {
  const { revenue, amountReceived, dueDate } = params;
  const now = params.now ?? new Date();

  const fullyPaid = amountReceived >= revenue && revenue > 0;
  if (fullyPaid) return "PAID";

  const isPastDue = dueDate !== null && dueDate.getTime() < now.getTime();
  if (isPastDue) return "OVERDUE";

  if (amountReceived > 0) return "PARTIALLY_PAID";

  return "PENDING";
}
