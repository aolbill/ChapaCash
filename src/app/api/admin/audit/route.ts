import { NextResponse } from "next/server";
import { handleApi, requestIdFrom } from "@/lib/http";
import { requireAdmin } from "@/server/auth/service";
import { connectMongo } from "@/lib/mongo";
import { AuditLog } from "@/server/db/models";

export async function GET(req: Request) {
  const requestId = requestIdFrom(req);
  return handleApi(requestId, async () => {
    await requireAdmin(req);
    await connectMongo();
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim();
    const filter = q
      ? {
          $or: [
            { action: { $regex: q, $options: "i" } },
            { entityId: q },
            { requestId: q },
          ],
        }
      : {};
    const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(100);
    return NextResponse.json({
      logs: logs.map((l) => ({
        id: String(l._id),
        action: l.action,
        reason: l.reason,
        requestId: l.requestId,
        entityType: l.entityType,
        entityId: l.entityId,
        actorUserId: l.actorUserId,
        createdAt: l.createdAt,
      })),
    });
  });
}
