import { NextResponse } from "next/server";
import { SITE_BANNER } from "@/domain/copy";
import { paystackConfigured } from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    banner: SITE_BANNER,
    realMoneyEnabled: paystackConfigured(),
    mpesaStk: true,
    enforcementEnabled: false,
    note: "Deposits credit 1 KES = 1 credit after Paystack confirms the charge.",
  });
}
