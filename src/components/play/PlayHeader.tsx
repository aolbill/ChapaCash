"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatPlayKes } from "@/components/ui/api";
import { SITE_NAME } from "@/domain/copy";
import { clearCachedSession } from "@/components/layout/session-cache";

const links = [
  { href: "/play", label: "Play" },
  { href: "/wallet", label: "Wallet" },
  { href: "/withdraw", label: "Withdraw" },
  { href: "/fairness", label: "Fairness" },
  { href: "/account", label: "Account" },
];

export function PlayLogo({ href = "/play" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 text-[17px] font-extrabold tracking-wide text-[#f2f3f7]">
      <span className="h-[30px] w-[30px] rounded-lg bg-[radial-gradient(circle_at_35%_30%,#ff5b66,#e11d2a)] shadow-[0_0_16px_rgba(225,29,42,.5)]" />
      <span>
        CHAPA
        <span className="ml-1 inline-block rounded-md bg-[#e11d2a] px-1.5 py-0.5 text-white">CASH</span>
      </span>
      <span className="sr-only">{SITE_NAME}</span>
    </Link>
  );
}

export function PlayHeader({
  loggedIn,
  role,
  cashCredits,
  promoCredits,
  walletKind,
  onWalletKind,
  onLogin,
  onRegister,
}: {
  loggedIn: boolean;
  role?: string;
  cashCredits?: string;
  promoCredits?: string;
  walletKind: "REAL" | "PROMO";
  onWalletKind: (k: "REAL" | "PROMO") => void;
  onLogin: () => void;
  onRegister: () => void;
}) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const allLinks = role === "ADMIN" ? [...links, { href: "/admin", label: "Admin" }] : links;
  const shown = walletKind === "REAL" ? cashCredits : promoCredits;

  useEffect(() => {
    setOpen(false);
  }, [path]);

  async function logout() {
    clearCachedSession();
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin", cache: "no-store" });
    router.push("/play");
  }

  return (
    <header className="relative flex items-center justify-between border-b border-[#2a2c34] bg-gradient-to-b from-[#16171b] to-[#101114] px-3 py-2.5 sm:px-3.5">
      <PlayLogo />
      {loggedIn ? (
        <div className="flex items-center gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={() => onWalletKind(walletKind === "REAL" ? "PROMO" : "REAL")}
            className="rounded-lg border border-[#2a2c34] px-2.5 py-1.5 text-[11px] font-extrabold text-[#8b8e99]"
          >
            {walletKind === "REAL" ? "Cash" : "Free"}
          </button>
          <Link
            href="/wallet#deposit"
            className="flex items-center gap-2 rounded-[11px] border border-[rgba(47,191,78,.35)] bg-[rgba(47,191,78,.1)] px-3 py-1.5 text-sm font-extrabold text-[#f2f3f7]"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#2fbf4e] shadow-[0_0_8px_#2fbf4e]" />
            <b className="text-[#2fbf4e]">{formatPlayKes(shown)}</b>
          </Link>
          <Link
            href="/wallet#deposit"
            className="rounded-[10px] bg-gradient-to-b from-[#2fbf4e] to-[#249b3e] px-3 py-2 text-[13px] font-extrabold text-white"
          >
            Deposit
          </Link>
          <button
            type="button"
            className="rounded-[10px] border border-[#2a2c34] px-3 py-2 text-[13px] font-bold"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            Menu
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onLogin}
            className="rounded-[10px] border border-white/85 bg-transparent px-[15px] py-2 text-[13px] font-bold text-white"
          >
            Login
          </button>
          <button
            type="button"
            onClick={onRegister}
            className="rounded-[10px] bg-gradient-to-b from-[#2fbf4e] to-[#249b3e] px-[15px] py-2 text-[13px] font-bold text-white"
          >
            Register
          </button>
        </div>
      )}
      {open && loggedIn ? (
        <div className="absolute inset-x-0 top-[52px] z-40 border-b border-[#2a2c34] bg-[#16171b] px-3 py-3">
          <nav className="mx-auto grid max-w-[1200px] grid-cols-2 gap-1.5">
            {allLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="min-h-11 rounded-lg bg-[#1d1e24] px-3 py-2.5 text-sm font-bold text-[#f2f3f7]"
              >
                {l.label}
              </Link>
            ))}
            <button
              type="button"
              className="col-span-2 min-h-11 rounded-lg bg-[#1d1e24] px-3 py-2.5 text-left text-sm font-bold text-[#8b8e99]"
              onClick={() => void logout()}
            >
              Log out
            </button>
          </nav>
        </div>
      ) : null}
    </header>
  );
}