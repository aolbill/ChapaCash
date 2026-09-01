"use client";

import { AppShell } from "@/components/layout/AppShell";
import { api } from "@/components/ui/api";
import { FormEvent, useEffect, useState } from "react";

export default function AuditPage() {
  const [q, setQ] = useState("");
  const [logs, setLogs] = useState<
    { id: string; action: string; reason: string; entityType: string; entityId: string; createdAt: string }[]
  >([]);

  async function search(e?: FormEvent) {
    e?.preventDefault();
    const data = await api<{ logs: typeof logs }>(`/api/admin/audit?q=${encodeURIComponent(q)}`);
    setLogs(data.logs);
  }

  useEffect(() => {
    void search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold">Audit log</h1>
        <form onSubmit={search} className="mt-4 flex gap-2">
          <input
            className="flex-1 border border-ink-700 bg-ink-900 px-3 py-2 text-sm"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Action, entity id, or request id"
          />
          <button className="bg-brand-wine px-4 py-2 text-brand-paper">Search</button>
        </form>
        <ul className="mt-4 space-y-2 text-sm">
          {logs.map((l) => (
            <li key={l.id} className="border border-ink-700 px-3 py-2">
              <span className="text-signal-teal">{l.action}</span> · {l.reason}
              <div className="text-mist-500">
                {l.entityType}:{l.entityId}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
