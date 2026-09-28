import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: "Your session has expired. Please refresh the page and log in again." }, { status: 401 });
  }

  // Clients referencing this source keep their lead-source history via
  // onDelete: SetNull on the relation — deleting a source never deletes clients.
  await prisma.leadSource.delete({ where: { id: params.id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
