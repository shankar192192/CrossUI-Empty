import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { resolveClientIdentity } from "../lib/clientResolution";
import { computeScheduledAt, computeNextDayFollowUp, DEMO_TIMEZONE } from "../lib/followups";
import { calculateProfit, calculatePendingPayment } from "../lib/calculations";

const prisma = new PrismaClient();

async function main() {
  console.log("Clearing existing data…");
  await prisma.activity.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.followUpLog.deleteMany();
  await prisma.client.deleteMany();
  await prisma.leadSource.deleteMany();
  await prisma.user.deleteMany();

  console.log("Creating users…");
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const salesPasswordHash = await bcrypt.hash("sales123", 10);

  const admin = await prisma.user.create({
    data: { name: "Shankar Mutneja", email: "admin@prepseven.com", passwordHash: adminPasswordHash, role: "ADMIN" },
  });
  await prisma.user.create({
    data: { name: "Sarah Reyes", email: "sarah@prepseven.com", passwordHash: salesPasswordHash, role: "SALESPERSON" },
  });
  await prisma.user.create({
    data: { name: "Raj Malhotra", email: "raj@prepseven.com", passwordHash: salesPasswordHash, role: "SALESPERSON" },
  });

  console.log("Creating lead sources…");
  const [seo, googleAds, chatgptAds] = await Promise.all([
    prisma.leadSource.create({ data: { name: "SEO" } }),
    prisma.leadSource.create({ data: { name: "Google Ads" } }),
    prisma.leadSource.create({ data: { name: "ChatGPT Ads" } }),
  ]);
  const sourceIds = [seo.id, googleAds.id, chatgptAds.id];

  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

  type SeedClient = {
    name: string;
    phone?: string;
    email?: string;
    manualTimezone?: string;
    requirement: string;
    dateAdded: Date;
    status: "NEW_LEAD" | "DEMO_SCHEDULED" | "FOLLOW_UP" | "CONVERTED" | "LOST";
    demoIn?: { daysFromNow: number; time: string }; // IST
    followUpPriority?: boolean;
    followUpLog?: { outcome: "FOLLOWED_UP_NEXT_DAY" | "FOLLOWED_UP_SPECIFIC_DATE"; note?: string };
    conversion?: {
      revenue: number;
      cost: number;
      payments: number[];
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
      dateAdded: daysAgo(2),
      status: "NEW_LEAD",
    },
    {
      name: "John Smith",
      phone: "+12125551234",
      manualTimezone: "America/New_York",
      email: "john.smith@example.com",
      requirement: "IB Physics HL tutoring",
      dateAdded: daysAgo(5),
      status: "FOLLOW_UP",
      followUpLog: { outcome: "FOLLOWED_UP_NEXT_DAY", note: "Discussed weekly schedule and pricing" },
    },
    {
      name: "Emily Clarke",
      phone: "+442071838750",
      email: "emily.clarke@example.com",
      requirement: "IB Chemistry SL tutoring",
      dateAdded: daysAgo(3),
      status: "DEMO_SCHEDULED",
      demoIn: { daysFromNow: 2, time: "16:00" },
    },
    {
      name: "Ahmed Al Maktoum",
      phone: "+971501234567",
      email: "ahmed.almaktoum@example.com",
      requirement: "IB Economics HL tutoring",
      dateAdded: daysAgo(20),
      status: "CONVERTED",
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
      dateAdded: daysAgo(30),
      status: "CONVERTED",
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
      dateAdded: daysAgo(18),
      status: "LOST",
      lostReason: "Chose a local tutor for scheduling convenience",
    },
    {
      name: "Michael Brown",
      phone: "+14165551987",
      manualTimezone: "America/Toronto",
      email: "michael.brown@example.com",
      requirement: "IB History HL tutoring",
      dateAdded: daysAgo(1),
      status: "FOLLOW_UP",
      followUpPriority: true,
      followUpLog: { outcome: "FOLLOWED_UP_NEXT_DAY" },
    },
    {
      name: "Hans Mueller",
      phone: "+4930123456",
      email: "hans.mueller@example.com",
      requirement: "IB Physics + German Ab Initio tutoring",
      dateAdded: daysAgo(4),
      status: "NEW_LEAD",
    },
    {
      name: "Priya Nair",
      phone: "+919845098450",
      email: "priya.nair@example.com",
      requirement: "IB Computer Science HL tutoring",
      dateAdded: daysAgo(6),
      status: "DEMO_SCHEDULED",
      demoIn: { daysFromNow: 1, time: "11:00" },
    },
    {
      // US spans multiple timezones — phone alone can't determine it, so we
      // manually confirm Los Angeles here (demonstrating the override path).
      name: "Sophia Martinez",
      phone: "+13105557890",
      manualTimezone: "America/Los_Angeles",
      email: "sophia.martinez@example.com",
      requirement: "IB Spanish B tutoring",
      dateAdded: daysAgo(40),
      status: "CONVERTED",
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
      dateAdded: daysAgo(7),
      status: "FOLLOW_UP",
      followUpLog: { outcome: "FOLLOWED_UP_NEXT_DAY" },
    },
    {
      // US number with no manual override -> timezone genuinely undetermined,
      // surfaced in the UI as "Needs confirmation" rather than guessed. The
      // follow-up still gets scheduled (falls back to IST) so it's never
      // silently dropped from the daily list.
      name: "Daniel Carter",
      phone: "+16465559981",
      email: "daniel.carter@example.com",
      requirement: "IB Psychology HL tutoring",
      dateAdded: daysAgo(1),
      status: "NEW_LEAD",
    },
  ];

  for (const [i, sc] of seedClients.entries()) {
    const identity = resolveClientIdentity({ phone: sc.phone, manualTimezone: sc.manualTimezone });
    const leadSourceId = sourceIds[i % sourceIds.length];

    const nextFollowUpAt =
      sc.status === "NEW_LEAD" || sc.status === "FOLLOW_UP" ? computeNextDayFollowUp(identity.timezone, sc.dateAdded) : null;

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
        leadSourceId,
        dateAdded: sc.dateAdded,
        status: sc.status,
        followUpPriority: sc.followUpPriority ?? false,
        nextFollowUpAt,
      },
    });

    await prisma.activity.create({
      data: {
        clientId: client.id,
        type: "LEAD_CREATED",
        message: `Lead created — ${sc.requirement}`,
        actorId: admin.id,
        occurredAt: sc.dateAdded,
      },
    });

    if (sc.demoIn) {
      const demoAt = computeScheduledAt(
        new Date(now.getTime() + sc.demoIn.daysFromNow * 86_400_000).toISOString().slice(0, 10),
        sc.demoIn.time,
        DEMO_TIMEZONE
      );
      await prisma.client.update({ where: { id: client.id }, data: { demoAt } });
      await prisma.activity.create({
        data: {
          clientId: client.id,
          type: "DEMO_SCHEDULED",
          message: `Demo scheduled for ${sc.demoIn.time} in ${sc.demoIn.daysFromNow} day(s) (IST)`,
          actorId: admin.id,
        },
      });
    }

    if (sc.followUpLog) {
      await prisma.followUpLog.create({
        data: {
          clientId: client.id,
          outcome: sc.followUpLog.outcome,
          note: sc.followUpLog.note ?? null,
          nextFollowUpAt,
        },
      });
      await prisma.activity.create({
        data: {
          clientId: client.id,
          type: "FOLLOW_UP_LOGGED",
          message: "Followed up — next follow-up scheduled for tomorrow",
          actorId: admin.id,
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
          nextFollowUpAt: null,
        },
      });

      await prisma.followUpLog.create({ data: { clientId: client.id, outcome: "CONVERTED", occurredAt: convertedAt } });

      await prisma.activity.create({
        data: {
          clientId: client.id,
          type: "CONVERTED",
          message: `Client converted — ${productService}. Revenue recorded: ${revenue}`,
          actorId: admin.id,
          occurredAt: convertedAt,
        },
      });

      let paidSoFar = 0;
      for (const [j, amount] of payments.entries()) {
        paidSoFar += amount;
        const paidAt = new Date(convertedAt.getTime() + j * 5 * 86_400_000);
        await prisma.payment.create({
          data: { clientId: client.id, amount, paidAt, method: j === 0 ? "Bank Transfer" : "UPI" },
        });
        await prisma.activity.create({
          data: {
            clientId: client.id,
            type: "PAYMENT_RECORDED",
            message: `Payment recorded: ${amount} (total received: ${paidSoFar})`,
            actorId: admin.id,
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
        data: { lostAt: now, lostReason: sc.lostReason ?? null, nextFollowUpAt: null },
      });
      await prisma.followUpLog.create({ data: { clientId: client.id, outcome: "LOST", note: sc.lostReason ?? null } });
      await prisma.activity.create({
        data: {
          clientId: client.id,
          type: "STATUS_CHANGED",
          message: `Status changed to Lost — ${sc.lostReason ?? ""}`,
          actorId: admin.id,
        },
      });
    }
  }

  console.log(`Seed complete: ${seedClients.length} clients, 3 users, 3 lead sources.`);
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
