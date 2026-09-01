export function formatBp(bp: number | null | undefined): string {
  if (bp == null) return "—";
  const whole = Math.floor(bp / 100);
  const frac = String(bp % 100).padStart(2, "0");
  return `${whole}.${frac}x`;
}

export function formatKes(value: string | number | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "KES 0";
  return `KES ${Math.trunc(n).toLocaleString("en-KE")}`;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message ?? "Request failed");
  }
  return data as T;
}
