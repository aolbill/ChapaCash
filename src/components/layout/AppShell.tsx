"use client";

import { Nav } from "@/components/layout/Nav";
import { api } from "@/components/ui/api";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

type Me = {
  id: string;
  email: string;
  displayName: string;
  publicName: string;
  role: string;
  cashCredits: string;
  promoCredits: string;
  hasDeposited: boolean;
};

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (!cancelled) router.replace("/login");
    }, 15000);
    void api<{ user: Me }>("/api/auth/me")
      .then((d) => {
        if (cancelled) return;
        window.clearTimeout(timeout);
        setMe(d.user);
      })
      .catch(() => {
        if (cancelled) return;
        window.clearTimeout(timeout);
        router.replace("/login");
      });
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [router]);

  if (!me) {
    return (
      <div className="grid min-h-[70vh] place-items-center px-4">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-pulse rounded-xl bg-brand-wine" />
          <p className="mt-4 text-sm font-semibold text-brand-wine">ChapaCash</p>
          <p className="mt-1 text-sm text-brand-muted">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Nav
        role={me.role}
        displayName={me.displayName}
        cashCredits={me.cashCredits}
        promoCredits={me.promoCredits}
      />
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </>
  );
}
