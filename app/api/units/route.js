import { NextResponse } from "next/server";
import { getLiveUnits } from "@/lib/getLiveUnits";

export const dynamic = "force-dynamic";

/** Live unit rows from DynamoDB (or Lambda URL). Polled by the client every ~15s. */
export async function GET() {
  const units = await getLiveUnits();
  return NextResponse.json(units ?? [], {
    headers: { "Cache-Control": "no-store" },
  });
}
