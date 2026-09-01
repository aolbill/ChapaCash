"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { formatKes } from "@/components/ui/api";
import { BrandMark } from "@/components/ui/chrome";

const links = [
  { href: "/play", label: "Play" },
  { href: "/wallet", label: "Wallet" },
  { href: "/withdraw", label: "Withdraw" },
  { href: "/fairness", label: "Fairness" },
  { href: "/responsible", label: "Responsible" },
  { href: "/account", label: "Account" },
];

function isActive(path: string | null, href: string) {
  if (href === "/play") return path === "/play";
  return Boolean(path?.startsWith(href));
}

export function Nav({
  role,
  displayName,
  cashCredits,
  promoCredits,
}: {
  role?: string;
  displayName?: string;
  cashCredits?: string;
  promoCredits?: string;
}) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const allLinks = role === "ADMIN" ? [...links, { href: "/admin", label: "Admin" }] : links;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-20 border-b border-brand-sand/60 bg-brand-cream/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <BrandMark href="/play" />
        <nav className="hidden items-center gap-0.5 text-sm lg:flex">
          {allLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-1.5 font-medium transition ${
                isActive(path, l.href)
                  ? "bg-brand-wine text-brand-paper"
                  : "text-brand-wine/80 hover:bg-brand-sand/35 hover:text-brand-wine"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold tabular-nums text-brand-wine">{formatKes(cashCredits)}</p>
            <p className="text-[11px] text-brand-muted">
              Cash · {formatKes(promoCredits)} free
              {displayName ? ` · ${displayName}` : ""}
            </p>
          </div>
          <Link href="/wallet#deposit" className="btn-primary py-2 text-xs sm:text-sm">
            Deposit
          </Link>
          <button
            type="button"
            className="btn-ghost px-3 py-2 lg:hidden"
            aria-expanded={open}
            aria-label="Open menu"
            onClick={() => setOpen((v) => !v)}
          >
            Menu
          </button>
          <button type="button" className="hidden text-sm font-medium text-brand-muted hover:text-brand-wine lg:inline" onClick={() => void logout()}>
            Log out
          </button>
        </div>
      </div>
      {open ? (
        <div className="border-t border-brand-sand/60 bg-brand-cream px-4 py-3 lg:hidden">
          <div className="mx-auto max-w-6xl space-y-3">
            <p className="text-sm font-semibold tabular-nums sm:hidden">{formatKes(cashCredits)} cash · {formatKes(promoCredits)} free</p>
            <nav className="grid grid-cols-2 gap-1">
              {allLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    isActive(path, l.href) ? "bg-brand-wine text-brand-paper" : "bg-white text-brand-wine"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
            <button type="button" className="w-full text-left text-sm font-medium text-brand-muted" onClick={() => void logout()}>
              Log out
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
