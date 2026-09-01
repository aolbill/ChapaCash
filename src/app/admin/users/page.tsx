"use client";

import { AppShell } from "@/components/layout/AppShell";
import { api } from "@/components/ui/api";
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
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold">Users</h1>
        <ul className="mt-4 space-y-2 text-sm">
          {users.map((u) => (
            <li key={u.id} className="flex justify-between border border-ink-700 px-3 py-2">
              <Link className="text-signal-teal" href={`/admin/users/${u.id}`}>
                {u.publicName}
              </Link>
              <span>
                {u.role} · {u.balanceCredits}
                {u.suspendedAt ? " · suspended" : ""}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
