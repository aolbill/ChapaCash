"use client";

import { Nav } from "@/components/layout/Nav";
import { getCachedSession, setCachedSession } from "@/components/layout/session-cache";
import { ApiHttpError, api } from "@/components/ui/api";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [me, setMe] = useState(getCachedSession());
  const [bootError, setBootError] = useState<string | null>(null);

  function remember(next: ReturnType<typeof getCachedSession>) {
    setCachedSession(next);
    setMe(next);
  }

  useEffect(() => {
    let cancelled = false;

    const load = () =>
      api<{ user: NonNullable<ReturnType<typeof getCachedSession>> }>("/api/auth/me")
        .then((d) => {
          if (cancelled) return;
          setBootError(null);
          remember(d.user);
        })
        .catch((err) => {
          if (cancelled) return;
          if (err instanceof ApiHttpError && err.status === 401) {
            remember(null);
            router.replace("/login");
            return;
          }
          if (!getCachedSession()) {
            setBootError(err instanceof Error ? err.message : "Could not load your session.");
          }
        });

    void load();
    const poll = window.setInterval(() => void load(), 60_000);
    const onFocus = () => {
      if (document.visibilityState === "visible") void load();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [router]);

  if (!me) {
    return (
      <div className="grid min-h-[70vh] place-items-center px-4">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-pulse rounded-xl bg-brand-wine" />
          <p className="mt-4 text-sm font-semibold text-brand-wine">ChapaCash</p>
          <p className="mt-1 text-sm text-brand-muted">
            {bootError ? bootError : "Loading your dashboard…"}
          </p>
          {bootError ? (
            <button type="button" className="btn-primary mt-4" onClick={() => window.location.reload()}>
              Try again
            </button>
          ) : null}
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
      <div className="mx-auto max-w-6xl px-3 pb-28 pt-4 sm:px-4 sm:py-8 lg:pb-8">{children}</div>
    </>
  );
}
