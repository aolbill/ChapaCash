import { requireUser } from "@/server/auth/service";
import { publicRoundState, reconnectSnapshot } from "@/server/game/service";
import { subscribeEvents } from "@/server/realtime/pubsub";
import { startEngine } from "@/worker/start";
import { userBalances } from "@/server/ledger/service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  startEngine();
  const user = await requireUser(req);
  const url = new URL(req.url);
  const after = Number(url.searchParams.get("afterSeq") ?? "0");

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let ticks = 0;

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
      const snap = await reconnectSnapshot(after);
      const balances = await userBalances(user.id);
      send({ type: "snapshot", ...balances, ...snap });
      unsubscribe = subscribeEvents((event) => {
        send({ type: "event", event });
      });
      heartbeat = setInterval(() => {
        void (async () => {
          const state = await publicRoundState();
          ticks += 1;
          if (ticks % 8 === 0) {
            const bal = await userBalances(user.id);
            send({ type: "state", ...bal, ...state });
          } else {
            send({ type: "state", ...state });
          }
        })();
      }, 250);
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
}
