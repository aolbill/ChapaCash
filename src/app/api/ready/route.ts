import { NextResponse } from "next/server";
import { mongoPing } from "@/lib/mongo";

export async function GET() {
  const mongo = await mongoPing();
  return NextResponse.json({ ready: mongo, mongo }, { status: mongo ? 200 : 503 });
}
