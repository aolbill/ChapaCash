"use client";

import { Nav } from "@/components/layout/Nav";
import {
  getCachedSession,
  hydrateSessionFromStorage,
  setCachedSession,
  useCachedSession,
} from "@/components/layout/session-cache";
import { ApiHttpError, api } from "@/components/ui/api";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";

export function AppShell({ children, dense = false }: { children: ReactNode; dense?: boolean }) {
  const router = useRouter();
  const path = usePathname();
  const isPlay = path === "/play";
  const isDense = dense || isPlay;
  const me = useCachedSession();
  const [bootError, setBootError] = useState<string | null>(null);

  useLayoutEffect(() => {
    hydrateSessionFromStorage();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = () =>
      api<{ user: NonNullable<ReturnType<typeof getCachedSession>> }>("/api/auth/me")
        .then((d) => {
          if (cancelled) return;
          setBootError(null);
          setCachedSession(d.user);
        })
        .catch((err) => {
          if (cancelled) return;
          if (err instanceof ApiHttpError && err.status === 401) {
            setCachedSession(null);
            if (!isPlay) router.replace("/login");
            return;
          }
          if (!getCachedSession() && !isPlay) {
            setBootError(err instanceof Error ? err.message : "Could not load your session.");
          }
        });

    void load();
    const poll = window.setInterval(() => void load(), 120_000);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
  }, [router, isPlay]);

  if (!me && !isPlay) {
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
      {path === "/play" || !me ? null : (
        <Nav
          role={me.role}
          displayName={me.displayName}
          cashCredits={me.cashCredits}
          promoCredits={me.promoCredits}
        />
      )}
      <div
        className={
          path === "/play"
            ? "play-root h-dvh overflow-hidden"
            : isDense
              ? "mx-auto max-w-[1440px] px-3 pb-28 pt-4 sm:px-4 lg:pb-4"
              : "mx-auto max-w-6xl px-3 pb-28 pt-4 sm:px-4 sm:py-8 lg:pb-8"
        }
      >
        {children}
      </div>
    </>
  );
}
