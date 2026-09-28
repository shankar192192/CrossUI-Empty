import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { createClientSchema } from "@/lib/validation";
import { resolveClientIdentity } from "@/lib/clientResolution";
import { logActivity } from "@/lib/activityLog";
import { serializeClient } from "@/lib/serialize";
import { computeNextDayFollowUp, isDueToday } from "@/lib/followups";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim();
  const status = sp.get("status");
  const country = sp.get("country");
  const timezone = sp.get("timezone");
  const leadSourceId = sp.get("leadSourceId");
  const converted = sp.get("converted"); // "true" | "false"
  const paymentStatus = sp.get("paymentStatus");
  const followUpDue = sp.get("followUpDue"); // "true"
  const dateFrom = sp.get("dateFrom");
  const dateTo = sp.get("dateTo");
  const convertedFrom = sp.get("convertedFrom");
  const convertedTo = sp.get("convertedTo");
  const sort = sp.get("sort") ?? "newest";
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(sp.get("pageSize") ?? "25", 10) || 25));

  const where: Prisma.ClientWhereInput = {};

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { requirement: { contains: q, mode: "insensitive" } },
    ];
  }
  if (status) where.status = status as Prisma.EnumClientStatusFilter["equals"];
  if (country) where.country = country;
  if (timezone) where.timezone = timezone;
  if (leadSourceId) where.leadSourceId = leadSourceId;
  if (converted === "true") where.status = "CONVERTED";
  if (converted === "false") where.status = { not: "CONVERTED" };
  if (dateFrom || dateTo) {
    where.dateAdded = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo + "T23:59:59") } : {}),
    };
  }
  if (convertedFrom || convertedTo) {
    where.convertedAt = {
      ...(convertedFrom ? { gte: new Date(convertedFrom) } : {}),
      ...(convertedTo ? { lte: new Date(convertedTo + "T23:59:59") } : {}),
    };
  }
  if (followUpDue === "true") {
    where.status = { in: ["NEW_LEAD", "FOLLOW_UP"] };
    where.nextFollowUpAt = { lte: new Date() };
  }

  let orderBy: Prisma.ClientOrderByWithRelationInput = { dateAdded: "desc" };
  if (sort === "oldest") orderBy = { dateAdded: "asc" };
  if (sort === "revenue") orderBy = { totalRevenue: "desc" };
  if (sort === "name") orderBy = { name: "asc" };
  if (sort === "followup") orderBy = { nextFollowUpAt: "asc" };

  const [total, clients] = await Promise.all([
    prisma.client.count({ where }),
    prisma.client.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        leadSource: true,
        payments: { orderBy: { paidAt: "desc" } },
      },
    }),
  ]);

  let serialized = clients.map((c) => serializeClient(c)!);

  // Payment status filter applied post-serialization since it's derived, not stored.
  if (paymentStatus) {
    serialized = serialized.filter((c) => c.paymentStatus === paymentStatus);
  }
  if (sort === "pending") {
    serialized = [...serialized].sort((a, b) => (b.pendingPayment ?? 0) - (a.pendingPayment ?? 0));
  }
  if (sort === "profit") {
    serialized = [...serialized].sort((a, b) => (b.profit ?? 0) - (a.profit ?? 0));
  }

  return NextResponse.json({ clients: serialized, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createClientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }
  const data = parsed.data;

  const identity = resolveClientIdentity({ phone: data.phone, manualTimezone: data.manualTimezone });
  if (data.phone && !identity.phoneE164 && identity.phoneError) {
    return NextResponse.json({ error: identity.phoneError }, { status: 400 });
  }

  const email = data.email ? data.email.toLowerCase().trim() : null;
  const force = req.nextUrl.searchParams.get("force") === "true";

  if (!force) {
    const duplicate = await prisma.client.findFirst({
      where: {
        OR: [
          identity.phoneE164 ? { phone: identity.phoneE164 } : undefined,
          email ? { email } : undefined,
        ].filter(Boolean) as Prisma.ClientWhereInput[],
      },
      select: { id: true, name: true, phone: true, email: true, status: true },
    });

    if (duplicate) {
      return NextResponse.json(
        {
          error: "A client with this phone number or email already exists",
          duplicate,
        },
        { status: 409 }
      );
    }
  }

  // Every new lead automatically gets a follow-up slot for tomorrow —
  // client-local 1PM if the timezone is confirmed, IST fallback otherwise.
  const nextFollowUpAt = computeNextDayFollowUp(identity.timezone);

  const client = await prisma.client.create({
    data: {
      name: data.name,
      phone: identity.phoneE164,
      email,
      country: identity.country,
      countryName: identity.countryName,
      timezone: identity.timezone,
      timezoneSource: identity.timezoneSource,
      timezoneConfident: identity.timezoneConfident,
      requirement: data.requirement || null,
      notes: data.notes || null,
      leadSourceId: data.leadSourceId || null,
      dateAdded: data.dateAdded ? new Date(data.dateAdded) : new Date(),
      status: "NEW_LEAD",
      nextFollowUpAt,
    },
  });

  await logActivity(prisma, {
    clientId: client.id,
    type: "LEAD_CREATED",
    message: `Lead created${data.requirement ? ` — ${data.requirement}` : ""}`,
    actorId: session.userId,
  });
  await logActivity(prisma, {
    clientId: client.id,
    type: "FOLLOW_UP_SCHEDULED",
    message: `Follow-up automatically scheduled for tomorrow`,
    actorId: session.userId,
  });

  const full = await prisma.client.findUnique({ where: { id: client.id }, include: { leadSource: true } });
  return NextResponse.json({ client: serializeClient(full), dueToday: isDueToday(nextFollowUpAt) }, { status: 201 });
}
