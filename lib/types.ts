export type ClientStatus = "NEW_LEAD" | "DEMO_SCHEDULED" | "FOLLOW_UP" | "CONVERTED" | "LOST";
export type PaymentStatus = "PENDING" | "PARTIALLY_PAID" | "PAID" | "OVERDUE";
export type FollowUpOutcome = "FOLLOWED_UP_NEXT_DAY" | "FOLLOWED_UP_SPECIFIC_DATE" | "DEMO_COMPLETED" | "CONVERTED" | "LOST";

export interface LeadSource {
  id: string;
  name: string;
}

export interface FollowUpLog {
  id: string;
  clientId: string;
  outcome: FollowUpOutcome;
  note: string | null;
  nextFollowUpAt: string | null;
  occurredAt: string;
}

export interface Payment {
  id: string;
  clientId: string;
  amount: number;
  paidAt: string;
  method: string | null;
  reference: string | null;
  notes: string | null;
}

export interface Activity {
  id: string;
  clientId: string;
  type: string;
  message: string;
  actor?: { id: string; name: string } | null;
  occurredAt: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  country: string | null;
  countryName: string | null;
  timezone: string | null;
  timezoneSource: "AUTO_DETECTED" | "MANUAL" | "UNDETERMINED";
  timezoneConfident: boolean;
  requirement: string | null;
  notes: string | null;
  leadSourceId: string | null;
  leadSource?: LeadSource | null;
  status: ClientStatus;
  dateAdded: string;
  demoAt: string | null;
  nextFollowUpAt: string | null;
  followUpPriority: boolean;
  convertedAt: string | null;
  productService: string | null;
  totalRevenue: number | null;
  totalCost: number | null;
  amountReceived: number;
  paymentDueDate: string | null;
  conversionNotes: string | null;
  lostReason: string | null;
  lostAt: string | null;
  profit: number | null;
  pendingPayment: number | null;
  paymentStatus: PaymentStatus | null;
  payments?: Payment[];
  activities?: Activity[];
  followUpLogs?: FollowUpLog[];
}

export interface DashboardMetrics {
  totalLeads: number;
  newLeads: number;
  demoScheduled: number;
  followUpStatusCount: number;
  followUpsDueToday: number;
  converted: number;
  lost: number;
  totalRevenue: number;
  totalProfit: number;
  totalReceived: number;
  pendingPayments: number;
  overduePayments: number;
}
