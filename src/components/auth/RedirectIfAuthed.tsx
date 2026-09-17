"use client";

import {
  hydrateSessionFromStorage,
  setCachedSession,
  useCachedSession,
} from "@/components/layout/session-cache";
import { ApiHttpError, api } from "@/components/ui/api";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";

/** Sends already-authenticated users to play (or another path) instead of auth screens. */
export function RedirectIfAuthed({
  children,
  to = "/play",
}: {
  children: ReactNode;
  to?: string;
}) {
  const router = useRouter();
  const me = useCachedSession();
  const [checking, setChecking] = useState(true);

  useLayoutEffect(() => {
    hydrateSessionFromStorage();
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (me) {
      router.replace(to);
      return;
    }

    void api<{ user: NonNullable<typeof me> }>("/api/auth/me")
      .then((d) => {
        if (cancelled) return;
        setCachedSession(d.user);
        router.replace(to);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiHttpError && err.status === 401) {
          setCachedSession(null);
        }
        setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [me, router, to]);

  if (me || checking) {
    return (
      <div className="grid min-h-[70vh] place-items-center px-4">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-pulse rounded-xl bg-[radial-gradient(circle_at_35%_30%,#ff5b66,#e11d2a)]" />
          <p className="mt-4 text-sm font-semibold text-brand-ink">ChapaCash</p>
          <p className="mt-1 text-sm text-brand-muted">Taking you to play…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
