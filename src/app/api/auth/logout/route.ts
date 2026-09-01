import { NextResponse } from "next/server";
import { handleApi, requestIdFrom } from "@/lib/http";
import { assertSameOrigin, clearSessionCookie, hashToken, readSessionToken } from "@/server/auth/service";
import { connectMongo } from "@/lib/mongo";
import { Session } from "@/server/db/models";

export async function POST(req: Request) {
  const requestId = requestIdFrom(req);
  return handleApi(requestId, async () => {
    assertSameOrigin(req);
    await connectMongo();
    const token = readSessionToken(req);
    if (token) {
      await Session.updateMany(
        { tokenHash: hashToken(token), revokedAt: null },
        { $set: { revokedAt: new Date() } },
      );
    }
    const res = NextResponse.json({ ok: true });
    res.headers.set("Set-Cookie", clearSessionCookie());
    return res;
  });
}
