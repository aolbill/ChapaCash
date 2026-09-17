"use client";

import { RedirectIfAuthed } from "@/components/auth/RedirectIfAuthed";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function GuestRegisterRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/play?auth=register");
  }, [router]);
  return (
    <div className="grid min-h-[70vh] place-items-center px-4">
      <p className="text-sm text-brand-muted">Opening registration…</p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <RedirectIfAuthed>
      <GuestRegisterRedirect />
    </RedirectIfAuthed>
  );
}
