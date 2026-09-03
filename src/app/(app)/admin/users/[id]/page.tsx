"use client";

import { api } from "@/components/ui/api";
import { AdminNav, PageHeader } from "@/components/ui/chrome";
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
      <div className="mx-auto max-w-xl space-y-6">
        <PageHeader
          kicker="Ops"
          title={data?.user.publicName ?? "User"}
          description={`${data?.user.email ?? ""} · ${data?.user.role ?? ""} · ${data?.balanceCredits ?? "—"} credits. Balance cannot be edited here.`}
          actions={<AdminNav />}
        />
        <form className="card space-y-4 p-5">
          <label className="label">
            Reason
            <input className="field" value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-danger" onClick={(e) => toggle(e, true)}>
              Suspend
            </button>
            <button type="button" className="btn-ghost" onClick={(e) => toggle(e, false)}>
              Reactivate
            </button>
          </div>
        </form>
        {msg ? <p className="alert-ok">{msg}</p> : null}
      </div>
  );
}
