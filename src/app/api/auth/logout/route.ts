import { NextResponse } from "next/server";
import { handleApi, requestIdFrom } from "@/lib/http";
import { assertSameOrigin, clearSessionCookie, hashToken, invalidateAuthCaches, readSessionToken } from "@/server/auth/service";
import { connectMongo } from "@/lib/mongo";
import { Session } from "@/server/db/models";

export async function POST(req: Request) {
  const requestId = requestIdFrom(req);
  return handleApi(requestId, async () => {
    assertSameOrigin(req);
    await connectMongo();
    const token = readSessionToken(req);
    if (token) {
      invalidateAuthCaches(token);
      await Session.updateMany(
        { tokenHash: hashToken(token), revokedAt: null },
        { $set: { revokedAt: new Date() } },
      );
    }
    const res = NextResponse.json({ ok: true });
    clearSessionCookie(res);
    return res;
  });
}
