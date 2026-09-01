import { AuditLog } from "@/server/db/models";
import { connectMongo } from "@/lib/mongo";

export async function writeAudit(input: {
  actorUserId?: string | null;
  subjectUserId?: string | null;
  action: string;
  reason: string;
  requestId: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}) {
  await connectMongo();
  await AuditLog.create({
    actorUserId: input.actorUserId ?? null,
    subjectUserId: input.subjectUserId ?? null,
    action: input.action,
    reason: input.reason,
    requestId: input.requestId,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata ?? null,
  });
}
