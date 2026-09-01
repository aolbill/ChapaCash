import { NextResponse } from "next/server";
import { metrics } from "@/lib/metrics";

export async function GET() {
  return NextResponse.json({
    playMoney: true,
    counters: metrics.snapshot(),
    note: "Placeholder process counters. Wire a metrics backend before production.",
  });
}
