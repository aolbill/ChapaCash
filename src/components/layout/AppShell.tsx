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
      <div className="grid min-h-[60vh] place-items-center text-mist-300">
        <p>Loading your dashboard…</p>
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
      <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
    </>
  );
}
