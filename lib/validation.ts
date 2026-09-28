import { z } from "zod";

export const CLIENT_STATUSES = [
  "NEW_LEAD",
  "DEMO_SCHEDULED",
  "FOLLOW_UP",
  "CONVERTED",
  "LOST",
] as const;

export const createClientSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(200),
    phone: z.string().trim().optional().or(z.literal("")),
    email: z.string().trim().email("Invalid email address").optional().or(z.literal("")),
    requirement: z.string().trim().max(2000).optional().or(z.literal("")),
    notes: z.string().trim().max(5000).optional().or(z.literal("")),
    leadSourceId: z.string().trim().optional().or(z.literal("")),
    dateAdded: z.string().optional(), // ISO date string; defaults to now
    manualTimezone: z.string().trim().optional().or(z.literal("")),
  })
  .refine((data) => (data.phone && data.phone.length > 0) || (data.email && data.email.length > 0), {
    message: "Provide at least a phone number or an email address",
    path: ["phone"],
  });

export type CreateClientInput = z.infer<typeof createClientSchema>;

export const updateClientSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  phone: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().email().optional().or(z.literal("")),
  requirement: z.string().trim().max(2000).optional().or(z.literal("")),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
  leadSourceId: z.string().trim().nullable().optional(),
  status: z.enum(CLIENT_STATUSES).optional(),
  manualTimezone: z.string().trim().optional().or(z.literal("")),
  lostReason: z.string().trim().max(1000).optional().or(z.literal("")),
  // Financial manual overrides (only meaningful post-conversion)
  totalRevenue: z.number().nonnegative().optional(),
  totalCost: z.number().nonnegative().optional(),
  paymentDueDate: z.string().nullable().optional(),
});

// Demo is always scheduled by the operator directly in IST.
export const scheduleDemoSchema = z.object({
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  localTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time"),
  note: z.string().trim().max(2000).optional().or(z.literal("")),
});

// The single daily action taken on a client in the follow-up list.
export const followUpActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("tomorrow"), note: z.string().trim().max(2000).optional().or(z.literal("")) }),
  z.object({
    action: z.literal("specific_date"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
    note: z.string().trim().max(2000).optional().or(z.literal("")),
  }),
  z.object({
    action: z.literal("lost"),
    lostReason: z.string().trim().max(1000).optional().or(z.literal("")),
  }),
]);

export const conversionSchema = z
  .object({
    revenue: z.number().nonnegative("Revenue cannot be negative"),
    cost: z.number().nonnegative("Cost cannot be negative").default(0),
    amountReceived: z.number().nonnegative("Amount received cannot be negative").default(0),
    paymentDueDate: z.string().nullable().optional(),
    productService: z.string().trim().max(300).optional().or(z.literal("")),
    conversionDate: z.string().optional(),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
    allowOverpayment: z.boolean().default(false),
  })
  .refine((data) => data.allowOverpayment || data.amountReceived <= data.revenue, {
    message: "Amount received cannot exceed revenue",
    path: ["amountReceived"],
  });

export const paymentSchema = z.object({
  amount: z.number().positive("Payment amount must be greater than zero"),
  paidAt: z.string().optional(),
  method: z.string().trim().max(100).optional().or(z.literal("")),
  reference: z.string().trim().max(200).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  allowOverpayment: z.boolean().default(false),
});

export const leadSourceSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
});
