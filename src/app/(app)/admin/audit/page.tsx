"use client";

import { api } from "@/components/ui/api";
import { AdminNav, EmptyState, PageHeader } from "@/components/ui/chrome";
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
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader kicker="Ops" title="Audit log" actions={<AdminNav />} />
        <form onSubmit={search} className="flex flex-col gap-2 sm:flex-row">
          <input
            className="field mt-0 min-w-0 flex-1"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Action, entity id, or request id"
          />
          <button className="btn-primary shrink-0 sm:w-auto">Search</button>
        </form>
        <ul className="space-y-2">
          {logs.map((l) => (
            <li key={l.id} className="list-row flex-col items-start">
              <span className="font-medium text-brand-wine">{l.action}</span>
              <span className="text-brand-wineDark">{l.reason}</span>
              <span className="text-xs text-brand-muted">
                {l.entityType}:{l.entityId}
              </span>
            </li>
          ))}
          {logs.length === 0 ? <EmptyState>No audit events.</EmptyState> : null}
        </ul>
      </div>
  );
}
