"use client";

import { AppShell } from "@/components/layout/AppShell";
import { api } from "@/components/ui/api";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<{
    user: { email: string; publicName: string; role: string; suspendedAt: string | null };
    balanceCredits: string;
  } | null>(null);
  const [reason, setReason] = useState("Play-money policy review");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void api<NonNullable<typeof data>>(`/api/admin/users/${id}`).then(setData);
  }, [id]);

  async function toggle(e: FormEvent, suspended: boolean) {
    e.preventDefault();
    await api(`/api/admin/users/${id}`, {
      method: "POST",
      body: JSON.stringify({ reason, suspended }),
    });
    setMsg(suspended ? "Suspended" : "Reactivated");
    const next = await api<NonNullable<typeof data>>(`/api/admin/users/${id}`);
    setData(next);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-2xl font-semibold">{data?.user.publicName}</h1>
        <p className="text-sm text-mist-300">
          {data?.user.email} · {data?.user.role} · {data?.balanceCredits} credits
        </p>
        <p className="text-xs text-mist-500">Balance cannot be edited here.</p>
        <form className="space-y-3">
          <input
            className="w-full border border-ink-700 bg-ink-900 px-3 py-2 text-sm"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex gap-2">
            <button className="border border-signal-rose px-3 py-2 text-sm text-signal-rose" onClick={(e) => toggle(e, true)}>
              Suspend
            </button>
            <button className="border border-signal-teal px-3 py-2 text-sm text-signal-teal" onClick={(e) => toggle(e, false)}>
              Reactivate
            </button>
          </div>
        </form>
        {msg ? <p className="text-sm">{msg}</p> : null}
      </div>
    </AppShell>
  );
}
