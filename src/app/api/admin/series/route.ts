import { NextResponse } from "next/server";
import { handleApi, readJson, requestIdFrom } from "@/lib/http";
import { requireAdmin } from "@/server/auth/service";
import { seriesRotateSchema } from "@/server/api/schemas";
import { getAdminSeriesPreview, requestSeriesRotate } from "@/server/game/series";
import { rateLimit } from "@/server/security/rateLimit";
import { env } from "@/lib/env";

export async function GET(req: Request) {
  const requestId = requestIdFrom(req);
  return handleApi(requestId, async () => {
    const admin = await requireAdmin(req);
    await rateLimit(`admin:${admin.id}`, Number(env.RATE_LIMIT_ADMIN_PER_MIN));
    const url = new URL(req.url);
    const count = Number(url.searchParams.get("count") ?? "40");
    return NextResponse.json(await getAdminSeriesPreview(Number.isFinite(count) ? count : 40));
  });
}

export async function POST(req: Request) {
  const requestId = requestIdFrom(req);
  return handleApi(requestId, async () => {
    const admin = await requireAdmin(req);
    await rateLimit(`admin:${admin.id}`, Number(env.RATE_LIMIT_ADMIN_PER_MIN));
    const body = seriesRotateSchema.parse(await readJson(req));
    const result = await requestSeriesRotate({
      actorUserId: admin.id,
      requestId,
      serverSeed: body.serverSeed,
    });
    const preview = await getAdminSeriesPreview();
    return NextResponse.json({ ...result, ...preview });
  });
}
