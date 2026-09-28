import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { leadSourceSchema } from "@/lib/validation";

export async function GET() {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const leadSources = await prisma.leadSource.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ leadSources });
}

export async function POST(req: NextRequest) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = leadSourceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const existing = await prisma.leadSource.findFirst({ where: { name: { equals: parsed.data.name, mode: "insensitive" } } });
  if (existing) {
    return NextResponse.json({ error: "This lead source already exists" }, { status: 409 });
  }

  const leadSource = await prisma.leadSource.create({ data: { name: parsed.data.name } });
  return NextResponse.json({ leadSource }, { status: 201 });
}
