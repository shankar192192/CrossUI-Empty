import { describe, it, expect } from "vitest";
import { calculateProfit, calculatePendingPayment, determinePaymentStatus } from "../calculations";

describe("calculateProfit", () => {
  it("computes revenue minus cost", () => {
    expect(calculateProfit(90000, 30000)).toBe(60000);
  });

  it("handles a loss (negative profit) without throwing", () => {
    expect(calculateProfit(10000, 15000)).toBe(-5000);
  });

  it("rounds to 2 decimal places", () => {
    expect(calculateProfit(100.1, 33.333)).toBeCloseTo(66.77, 2);
  });
});

describe("calculatePendingPayment", () => {
  it("computes revenue minus amount received", () => {
    expect(calculatePendingPayment(100000, 75000)).toBe(25000);
  });

  it("never goes negative even if overpaid", () => {
    expect(calculatePendingPayment(100000, 120000)).toBe(0);
  });

  it("equals full revenue when nothing has been received", () => {
    expect(calculatePendingPayment(50000, 0)).toBe(50000);
  });
});

describe("determinePaymentStatus", () => {
  const now = new Date("2026-05-10T00:00:00.000Z");

  it("is PAID when amount received meets or exceeds revenue", () => {
    expect(determinePaymentStatus({ revenue: 100000, amountReceived: 100000, dueDate: null, now })).toBe("PAID");
    expect(determinePaymentStatus({ revenue: 100000, amountReceived: 120000, dueDate: null, now })).toBe("PAID");
  });

  it("is PARTIALLY_PAID when some but not all has been received and not past due", () => {
    const future = new Date("2026-06-01T00:00:00.000Z");
    expect(determinePaymentStatus({ revenue: 100000, amountReceived: 40000, dueDate: future, now })).toBe(
      "PARTIALLY_PAID"
    );
  });

  it("is PENDING when nothing received and not past due", () => {
    expect(determinePaymentStatus({ revenue: 100000, amountReceived: 0, dueDate: null, now })).toBe("PENDING");
  });

  it("is OVERDUE when the due date has passed and payment is incomplete", () => {
    const past = new Date("2026-04-01T00:00:00.000Z");
    expect(determinePaymentStatus({ revenue: 100000, amountReceived: 20000, dueDate: past, now })).toBe("OVERDUE");
    expect(determinePaymentStatus({ revenue: 100000, amountReceived: 0, dueDate: past, now })).toBe("OVERDUE");
  });

  it("prioritizes PAID over OVERDUE even if the due date has passed", () => {
    const past = new Date("2026-04-01T00:00:00.000Z");
    expect(determinePaymentStatus({ revenue: 100000, amountReceived: 100000, dueDate: past, now })).toBe("PAID");
  });
});
