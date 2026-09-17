"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Withdraw lives inside Wallet for bettors. */
export default function WithdrawPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/wallet#withdraw");
  }, [router]);
  return (
    <div className="grid min-h-[40vh] place-items-center px-4">
      <p className="text-sm text-brand-muted">Opening wallet…</p>
    </div>
  );
}
