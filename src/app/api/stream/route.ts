import { ApiError } from "@/domain/errors";
import { handleApi, requestIdFrom } from "@/lib/http";
import { assertActiveUser, authUserById, sessionUserIdFromRequest } from "@/server/auth/service";
import { publicRoundState, reconnectSnapshot } from "@/server/game/service";
import { subscribeEvents } from "@/server/realtime/pubsub";
import { startEngine } from "@/worker/start";
import { userBalances } from "@/server/ledger/service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const requestId = requestIdFrom(req);
  return handleApi(requestId, async () => {
    startEngine();
    const userId = await sessionUserIdFromRequest(req);
    if (!userId) throw new ApiError("unauthorized", 401, "Authentication required.");
    const url = new URL(req.url);
    const after = Number(url.searchParams.get("afterSeq") ?? "0");

    const encoder = new TextEncoder();
    let unsubscribe: (() => void) | undefined;
    let heartbeat: ReturnType<typeof setInterval> | undefined;

    const stream = new ReadableStream({
      async start(controller) {
        let open = true;
        const send = (data: unknown) => {
          if (!open) return;
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch {
            open = false;
          }
        };
        const [found, snap, balances] = await Promise.all([
          authUserById(userId),
          reconnectSnapshot(after),
          userBalances(userId),
        ]);
        assertActiveUser(found);
        send({ type: "snapshot", ...balances, ...snap });
        unsubscribe = subscribeEvents((event) => {
          send({ type: "event", event });
        });
        heartbeat = setInterval(() => {
          void (async () => {
            const state = await publicRoundState();
            send({ type: "state", ...state });
          })();
        }, 1000);
      },
      cancel() {
        unsubscribe?.();
        if (heartbeat) clearInterval(heartbeat);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  });
}
