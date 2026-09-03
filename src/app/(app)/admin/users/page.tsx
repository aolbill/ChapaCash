"use client";

import { api } from "@/components/ui/api";
import { AdminNav, EmptyState, PageHeader, StatusBadge } from "@/components/ui/chrome";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<
    { id: string; email: string; publicName: string; role: string; suspendedAt: string | null; balanceCredits: string }[]
  >([]);

  useEffect(() => {
    void api<{ users: typeof users }>("/api/admin/users").then((d) => setUsers(d.users));
  }, []);

  return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader kicker="Ops" title="Users" actions={<AdminNav />} />
        <ul className="space-y-2">
          {users.map((u) => (
            <li key={u.id} className="list-row">
              <Link className="link-quiet" href={`/admin/users/${u.id}`}>
                {u.publicName}
              </Link>
              <span className="flex items-center gap-2 text-brand-muted">
                {u.role} · {u.balanceCredits}
                {u.suspendedAt ? <StatusBadge tone="danger">suspended</StatusBadge> : null}
              </span>
            </li>
          ))}
          {users.length === 0 ? <EmptyState>No users found.</EmptyState> : null}
        </ul>
      </div>
  );
}
