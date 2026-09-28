import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { resolveClientIdentity } from "../lib/clientResolution";
import { computeScheduledAt, computeDefaultNoonFollowUp } from "../lib/followups";
import { calculateProfit, calculatePendingPayment } from "../lib/calculations";

const prisma = new PrismaClient();

async function main() {
  console.log("Clearing existing data…");
  await prisma.activity.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.followUp.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  console.log("Creating users…");
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const salesPasswordHash = await bcrypt.hash("sales123", 10);

  const admin = await prisma.user.create({
    data: { name: "Shankar Mutneja", email: "admin@prepseven.com", passwordHash: adminPasswordHash, role: "ADMIN" },
  });
  const sarah = await prisma.user.create({
    data: { name: "Sarah Reyes", email: "sarah@prepseven.com", passwordHash: salesPasswordHash, role: "SALESPERSON" },
  });
  const raj = await prisma.user.create({
    data: { name: "Raj Malhotra", email: "raj@prepseven.com", passwordHash: salesPasswordHash, role: "SALESPERSON" },
  });

  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

  type SeedClient = {
    name: string;
    phone?: string;
    email?: string;
    manualTimezone?: string;
    requirement: string;
    notes?: string;
    leadSource: string;
    dateAdded: Date;
    status: "NEW_LEAD" | "DEMO_SCHEDULED" | "FOLLOW_UP" | "CONVERTED" | "LOST";
    assignedUserId?: string;
    demoAt?: Date;
    followUp?: { localDate: string; localTime: string; note?: string; status?: "PENDING" | "COMPLETED" };
    conversion?: {
      revenue: number;
      cost: number;
      payments: number[]; // sequential payment amounts
      paymentDueDate?: Date;
      productService: string;
      convertedDaysAgo: number;
    };
    lostReason?: string;
  };

  const seedClients: SeedClient[] = [
    {
      name: "Aditya Sharma",
      phone: "+919876543210",
      email: "aditya.sharma@example.com",
      requirement: "IB Mathematics AA HL tutoring",
      leadSource: "WEBSITE",
      dateAdded: daysAgo(2),
      status: "NEW_LEAD",
      assignedUserId: sarah.id,
    },
    {
      name: "John Smith",
      phone: "+12125551234",
      manualTimezone: "America/New_York",
      email: "john.smith@example.com",
      requirement: "IB Physics HL tutoring",
      leadSource: "REFERRAL",
      dateAdded: daysAgo(5),
      status: "FOLLOW_UP",
      assignedUserId: sarah.id,
      followUp: { localDate: now.toISOString().slice(0, 10), localTime: "12:00", note: "Discuss weekly schedule and pricing" },
    },
    {
      name: "Emily Clarke",
      phone: "+442071838750",
      email: "emily.clarke@example.com",
      requirement: "IB Chemistry SL tutoring",
      leadSource: "INSTAGRAM",
      dateAdded: daysAgo(3),
      status: "DEMO_SCHEDULED",
      assignedUserId: raj.id,
      demoAt: new Date(now.getTime() + 2 * 86_400_000),
    },
    {
      name: "Ahmed Al Maktoum",
      phone: "+971501234567",
      email: "ahmed.almaktoum@example.com",
      requirement: "IB Economics HL tutoring",
      leadSource: "GOOGLE_ADS",
      dateAdded: daysAgo(20),
      status: "CONVERTED",
      assignedUserId: sarah.id,
      conversion: {
        revenue: 90000,
        cost: 30000,
        payments: [50000, 15000],
        paymentDueDate: new Date(now.getTime() + 10 * 86_400_000),
        productService: "IB Economics HL — 40 session package",
        convertedDaysAgo: 15,
      },
    },
    {
      name: "Olivia Turner",
      phone: "+61291234567",
      email: "olivia.turner@example.com",
      requirement: "IB English A Lang & Lit tutoring",
      leadSource: "WHATSAPP_INBOUND",
      dateAdded: daysAgo(30),
      status: "CONVERTED",
      assignedUserId: raj.id,
      conversion: {
        revenue: 60000,
        cost: 18000,
        payments: [60000],
        productService: "IB English A — full year package",
        convertedDaysAgo: 25,
      },
    },
    {
      name: "Wei Tan",
      phone: "+6591234567",
      email: "wei.tan@example.com",
      requirement: "IB Biology HL tutoring",
      leadSource: "FACEBOOK",
      dateAdded: daysAgo(18),
      status: "LOST",
      assignedUserId: sarah.id,
      lostReason: "Chose a local tutor for scheduling convenience",
    },
    {
      name: "Michael Brown",
      phone: "+14165551987",
      manualTimezone: "America/Toronto",
      email: "michael.brown@example.com",
      requirement: "IB History HL tutoring",
      leadSource: "WALK_IN",
      dateAdded: daysAgo(1),
      status: "FOLLOW_UP",
      assignedUserId: raj.id,
      followUp: { localDate: now.toISOString().slice(0, 10), localTime: "12:00", note: "Follow up on demo feedback" },
    },
    {
      name: "Hans Mueller",
      phone: "+4930123456",
      email: "hans.mueller@example.com",
      requirement: "IB Physics + German Ab Initio tutoring",
      leadSource: "PARTNER_SCHOOL",
      dateAdded: daysAgo(4),
      status: "NEW_LEAD",
      assignedUserId: sarah.id,
    },
    {
      name: "Priya Nair",
      phone: "+919845098450",
      email: "priya.nair@example.com",
      requirement: "IB Computer Science HL tutoring",
      leadSource: "OTHER",
      dateAdded: daysAgo(6),
      status: "DEMO_SCHEDULED",
      assignedUserId: raj.id,
      demoAt: new Date(now.getTime() + 86_400_000),
    },
    {
      // US spans multiple timezones — phone alone can't determine it, so we
      // manually confirm Los Angeles here (demonstrating the override path).
      name: "Sophia Martinez",
      phone: "+13105557890",
      manualTimezone: "America/Los_Angeles",
      email: "sophia.martinez@example.com",
      requirement: "IB Spanish B tutoring",
      leadSource: "GOOGLE_ADS",
      dateAdded: daysAgo(40),
      status: "CONVERTED",
      assignedUserId: sarah.id,
      conversion: {
        revenue: 45000,
        cost: 12000,
        payments: [10000],
        paymentDueDate: daysAgo(5), // already past due -> OVERDUE
        productService: "IB Spanish B SL — exam prep package",
        convertedDaysAgo: 35,
      },
    },
    {
      // Australia also spans multiple timezones — Perth confirmed manually.
      name: "Liam O'Connor",
      phone: "+61893351234",
      manualTimezone: "Australia/Perth",
      email: "liam.oconnor@example.com",
      requirement: "IB Business Management tutoring",
      leadSource: "REFERRAL",
      dateAdded: daysAgo(7),
      status: "FOLLOW_UP",
      assignedUserId: raj.id,
      followUp: { localDate: now.toISOString().slice(0, 10), localTime: "12:00" },
    },
    {
      // US number with no manual override -> timezone genuinely undetermined,
      // surfaced in the UI as "Needs confirmation" rather than guessed.
      name: "Daniel Carter",
      phone: "+16465559981",
      email: "daniel.carter@example.com",
      requirement: "IB Psychology HL tutoring",
      leadSource: "WEBSITE",
      dateAdded: daysAgo(1),
      status: "NEW_LEAD",
      assignedUserId: sarah.id,
    },
  ];

  for (const sc of seedClients) {
    const identity = resolveClientIdentity({ phone: sc.phone, manualTimezone: sc.manualTimezone });

    const client = await prisma.client.create({
      data: {
        name: sc.name,
        phone: identity.phoneE164,
        email: sc.email ?? null,
        country: identity.country,
        countryName: identity.countryName,
        timezone: identity.timezone,
        timezoneSource: identity.timezoneSource,
        timezoneConfident: identity.timezoneConfident,
        requirement: sc.requirement,
        notes: sc.notes ?? null,
        leadSource: sc.leadSource as never,
        dateAdded: sc.dateAdded,
        status: sc.status,
        assignedUserId: sc.assignedUserId ?? null,
        demoAt: sc.demoAt ?? null,
      },
    });

    await prisma.activity.create({
      data: {
        clientId: client.id,
        type: "LEAD_CREATED",
        message: `Lead created — ${sc.requirement}`,
        actorId: sc.assignedUserId ?? admin.id,
        occurredAt: sc.dateAdded,
      },
    });

    if (sc.demoAt) {
      await prisma.activity.create({
        data: {
          clientId: client.id,
          type: "DEMO_SCHEDULED",
          message: `Demo scheduled for ${sc.demoAt.toDateString()}`,
          actorId: sc.assignedUserId ?? admin.id,
          occurredAt: new Date(sc.dateAdded.getTime() + 3_600_000),
        },
      });
    }

    if (sc.followUp && client.timezone) {
      const scheduledAt = computeScheduledAt(sc.followUp.localDate, sc.followUp.localTime, client.timezone);
      await prisma.followUp.create({
        data: {
          clientId: client.id,
          localDate: sc.followUp.localDate,
          localTime: sc.followUp.localTime,
          timezone: client.timezone,
          scheduledAt,
          note: sc.followUp.note ?? null,
          isDefaultNoon: sc.followUp.localTime === "12:00",
          status: sc.followUp.status ?? "PENDING",
          assignedUserId: sc.assignedUserId ?? null,
        },
      });
      await prisma.activity.create({
        data: {
          clientId: client.id,
          type: "FOLLOW_UP_SCHEDULED",
          message: `Follow-up scheduled for ${sc.followUp.localTime} on ${sc.followUp.localDate} (${client.timezone})`,
          actorId: sc.assignedUserId ?? admin.id,
        },
      });
    } else if (client.timezone && (sc.status === "FOLLOW_UP")) {
      const def = computeDefaultNoonFollowUp(client.timezone);
      await prisma.followUp.create({
        data: {
          clientId: client.id,
          localDate: def.localDate,
          localTime: def.localTime,
          timezone: client.timezone,
          scheduledAt: def.scheduledAt,
          isDefaultNoon: true,
          status: "PENDING",
          assignedUserId: sc.assignedUserId ?? null,
        },
      });
    }

    if (sc.conversion) {
      const { revenue, cost, payments, paymentDueDate, productService, convertedDaysAgo } = sc.conversion;
      const amountReceived = payments.reduce((a, b) => a + b, 0);
      const convertedAt = daysAgo(convertedDaysAgo);

      await prisma.client.update({
        where: { id: client.id },
        data: {
          convertedAt,
          productService,
          totalRevenue: revenue,
          totalCost: cost,
          amountReceived,
          paymentDueDate: paymentDueDate ?? null,
          conversionNotes: "Converted after a successful trial session.",
        },
      });

      await prisma.activity.create({
        data: {
          clientId: client.id,
          type: "CONVERTED",
          message: `Client converted — ${productService}. Revenue recorded: ${revenue}`,
          actorId: sc.assignedUserId ?? admin.id,
          occurredAt: convertedAt,
        },
      });

      let paidSoFar = 0;
      for (const [i, amount] of payments.entries()) {
        paidSoFar += amount;
        const paidAt = new Date(convertedAt.getTime() + i * 5 * 86_400_000);
        await prisma.payment.create({
          data: { clientId: client.id, amount, paidAt, method: i === 0 ? "Bank Transfer" : "UPI" },
        });
        await prisma.activity.create({
          data: {
            clientId: client.id,
            type: "PAYMENT_RECORDED",
            message: `Payment recorded: ${amount} (total received: ${paidSoFar})`,
            actorId: sc.assignedUserId ?? admin.id,
            occurredAt: paidAt,
          },
        });
      }

      const profit = calculateProfit(revenue, cost);
      const pending = calculatePendingPayment(revenue, amountReceived);
      console.log(`  ${sc.name}: revenue=${revenue} cost=${cost} profit=${profit} received=${amountReceived} pending=${pending}`);
    }

    if (sc.status === "LOST") {
      await prisma.client.update({
        where: { id: client.id },
        data: { lostAt: now, lostReason: sc.lostReason ?? null },
      });
      await prisma.activity.create({
        data: {
          clientId: client.id,
          type: "STATUS_CHANGED",
          message: `Status changed from New Lead to Lost — ${sc.lostReason ?? ""}`,
          actorId: sc.assignedUserId ?? admin.id,
        },
      });
    }
  }

  console.log(`Seed complete: ${seedClients.length} clients, 3 users.`);
  console.log("Login with: admin@prepseven.com / admin123  or  sarah@prepseven.com / sales123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
