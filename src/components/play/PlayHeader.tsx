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
  { href: "/account", label: "Account" },
];

const secondaryLinks = [
  { href: "/fairness", label: "Fairness" },
  { href: "/responsible", label: "Responsible play" },
];

export function PlayLogo({ href = "/play" }: { href?: string }) {
  return (
    <Link href={href} className="flex min-w-0 items-center gap-1.5 text-sm font-extrabold tracking-wide text-[#f2f3f7] sm:gap-2 sm:text-[17px]">
      <span className="h-7 w-7 shrink-0 rounded-lg bg-[radial-gradient(circle_at_35%_30%,#ff5b66,#e11d2a)] shadow-[0_0_16px_rgba(225,29,42,.5)] sm:h-[30px] sm:w-[30px]" />
      <span className="truncate">
        <span className="max-[340px]:hidden">CHAPA</span>
        <span className="ml-0 inline-block rounded-md bg-[#e11d2a] px-1 py-0.5 text-white max-[340px]:ml-0 sm:ml-1 sm:px-1.5">
          <span className="max-[340px]:inline min-[341px]:hidden">CC</span>
          <span className="max-[340px]:hidden">CASH</span>
        </span>
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
    <header className="relative z-50 border-b border-[#2a2c34] bg-gradient-to-b from-[#16171b] to-[#101114] px-2.5 py-2 sm:px-3.5 sm:py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PlayLogo />
        {loggedIn ? (
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2.5">
            <button
              type="button"
              onClick={() => onWalletKind(walletKind === "REAL" ? "PROMO" : "REAL")}
              className="rounded-lg border border-[#2a2c34] px-2 py-1.5 text-[10px] font-extrabold text-[#8b8e99] sm:px-2.5 sm:text-[11px]"
            >
              {walletKind === "REAL" ? "Cash" : "Free"}
            </button>
            <Link
              href="/wallet#deposit"
              className="flex max-w-[40vw] items-center gap-1.5 truncate rounded-[11px] border border-[rgba(47,191,78,.35)] bg-[rgba(47,191,78,.1)] px-2 py-1.5 text-xs font-extrabold text-[#f2f3f7] sm:max-w-none sm:gap-2 sm:px-3 sm:text-sm"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#2fbf4e] shadow-[0_0_8px_#2fbf4e]" />
              <b className="truncate text-[#2fbf4e]">{formatPlayKes(shown)}</b>
            </Link>
            <Link
              href="/wallet#deposit"
              className="inline-flex rounded-[10px] bg-gradient-to-b from-[#2fbf4e] to-[#249b3e] px-2.5 py-2 text-[12px] font-extrabold text-white sm:px-3 sm:text-[13px]"
            >
              Deposit
            </Link>
            <button
              type="button"
              className="rounded-[10px] border border-[#2a2c34] px-2.5 py-2 text-[12px] font-bold sm:px-3 sm:text-[13px]"
              aria-expanded={open}
              aria-controls="play-menu"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? "Close" : "Menu"}
            </button>
          </div>
        ) : (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={onLogin}
              className="rounded-[10px] border border-white/85 bg-transparent px-2.5 py-2 text-[12px] font-bold text-white sm:px-[15px] sm:text-[13px]"
            >
              Login
            </button>
            <button
              type="button"
              onClick={onRegister}
              className="rounded-[10px] bg-gradient-to-b from-[#2fbf4e] to-[#249b3e] px-2.5 py-2 text-[12px] font-bold text-white sm:px-[15px] sm:text-[13px]"
            >
              Register
            </button>
          </div>
        )}
      </div>
      {open && loggedIn ? (
        <div id="play-menu" className="mt-2 border-t border-[#2a2c34] pt-3">
          <nav className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {allLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="min-h-11 rounded-lg bg-[#1d1e24] px-3 py-2.5 text-sm font-bold text-[#f2f3f7]"
              >
                {l.label}
              </Link>
            ))}
            {secondaryLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="min-h-11 rounded-lg bg-[#1d1e24]/70 px-3 py-2.5 text-sm font-bold text-[#8b8e99]"
              >
                {l.label}
              </Link>
            ))}
            <button
              type="button"
              className="col-span-2 min-h-11 rounded-lg bg-[#1d1e24] px-3 py-2.5 text-left text-sm font-bold text-[#8b8e99] sm:col-span-3"
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
