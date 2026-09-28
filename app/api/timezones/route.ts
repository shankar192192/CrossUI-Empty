import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { allTimezones, timezonesForCountry } from "@/lib/timezone";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: "Your session has expired. Please refresh the page and log in again." }, { status: 401 });
  }

  const country = req.nextUrl.searchParams.get("country");
  if (country) {
    return NextResponse.json({ timezones: timezonesForCountry(country) });
  }
  return NextResponse.json({ timezones: allTimezones() });
}
