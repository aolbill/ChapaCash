"use client";

import { Nav } from "@/components/layout/Nav";
import { api } from "@/components/ui/api";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

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

export function AppShell({ children, dense = false }: { children: ReactNode; dense?: boolean }) {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const meRef = useRef<Me | null>(null);

  useEffect(() => {
    meRef.current = me;
  }, [me]);

  useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (!cancelled && !meRef.current) router.replace("/login");
    }, 15000);

    const load = () =>
      api<{ user: Me }>("/api/auth/me")
        .then((d) => {
          if (cancelled) return;
          window.clearTimeout(timeout);
          meRef.current = d.user;
          setMe(d.user);
        })
        .catch(() => {
          if (cancelled) return;
          window.clearTimeout(timeout);
          if (!meRef.current) router.replace("/login");
        });

    void load();
    const poll = window.setInterval(() => void load(), 5000);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      window.clearInterval(poll);
      window.removeEventListener("focus", onFocus);
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
      <div className={dense ? "mx-auto max-w-[1440px] px-3 py-4 sm:px-4" : "mx-auto max-w-6xl px-4 py-8"}>
        {children}
      </div>
    </>
  );
}
