const counters = new Map<string, number>();

export const metrics = {
  inc(name: string, by = 1) {
    counters.set(name, (counters.get(name) ?? 0) + by);
  },
  snapshot(): Record<string, number> {
    return Object.fromEntries(counters.entries());
  },
};
