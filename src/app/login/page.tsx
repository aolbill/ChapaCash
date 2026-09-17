"use client";

import { RedirectIfAuthed } from "@/components/auth/RedirectIfAuthed";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function GuestLoginRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/play?auth=login");
  }, [router]);
  return (
    <div className="grid min-h-[70vh] place-items-center px-4">
      <p className="text-sm text-brand-muted">Opening log in…</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <RedirectIfAuthed>
      <GuestLoginRedirect />
    </RedirectIfAuthed>
  );
}
