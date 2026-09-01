type RealtimeEvent = {
  roundId: string;
  seq: number;
  type: string;
  ts: string;
  payload: Record<string, unknown>;
};

const listeners = new Set<(e: RealtimeEvent) => void>();

export function publishEvent(event: RealtimeEvent): void {
  for (const l of listeners) l(event);
}

export function subscribeEvents(fn: (e: RealtimeEvent) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
