import { NextResponse } from "next/server";
import { handleApi, requestIdFrom } from "@/lib/http";
import { requireUser } from "@/server/auth/service";
import { connectMongo } from "@/lib/mongo";
import { Session } from "@/server/db/models";

export async function GET(req: Request) {
  const requestId = requestIdFrom(req);
  return handleApi(requestId, async () => {
    const user = await requireUser(req);
    await connectMongo();
    const sessions = await Session.find({ userId: user.id }).sort({ createdAt: -1 }).limit(20).lean();
    return NextResponse.json({
      sessions: sessions.map((s) => ({
        id: String(s._id),
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        revokedAt: s.revokedAt,
        userAgent: s.userAgent,
      })),
    });
  });
}
