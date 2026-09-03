"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatKes } from "@/components/ui/api";
import { BrandMark } from "@/components/ui/chrome";
import { clearCachedSession } from "@/components/layout/session-cache";

const links = [
  { href: "/play", label: "Play" },
  { href: "/wallet", label: "Wallet" },
  { href: "/withdraw", label: "Withdraw" },
  { href: "/fairness", label: "Fairness" },
  { href: "/responsible", label: "Responsible" },
  { href: "/account", label: "Account" },
];

const tabs = [
  { href: "/play", label: "Play" },
  { href: "/wallet", label: "Wallet" },
  { href: "/withdraw", label: "Cash out" },
  { href: "/account", label: "Account" },
];

function isActive(path: string | null, href: string) {
  if (href === "/play") return path === "/play";
  return Boolean(path?.startsWith(href));
}

function TabIcon({ href }: { href: string }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
  if (href === "/play") {
    return (
      <svg {...common}>
        <path d="M4 16c4-1 7-8 8-12 1 4 4 11 8 12" />
        <path d="M12 4v16" />
      </svg>
    );
  }
  if (href === "/wallet") {
    return (
      <svg {...common}>
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M3 10h18" />
        <circle cx="16.5" cy="14.5" r="1" fill="currentColor" />
      </svg>
    );
  }
  if (href === "/withdraw") {
    return (
      <svg {...common}>
        <path d="M12 4v12" />
        <path d="M7 11l5 5 5-5" />
        <path d="M5 20h14" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 19c1.4-3 4-4.5 7-4.5S17.6 16 19 19" />
    </svg>
  );
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

  useEffect(() => {
    setOpen(false);
  }, [path]);

  async function logout() {
    clearCachedSession();
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin", cache: "no-store" });
    router.push("/login");
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-brand-sand/60 bg-brand-cream/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
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
          <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-3">
            <div className="min-w-0 text-right">
              <p className="truncate text-xs font-semibold tabular-nums text-brand-wine sm:text-sm">
                {formatKes(cashCredits)}
              </p>
              <p className="hidden truncate text-[11px] text-brand-muted sm:block">
                Cash · {formatKes(promoCredits)} free
                {displayName ? ` · ${displayName}` : ""}
              </p>
            </div>
            <Link href="/wallet#deposit" className="btn-primary px-3 py-2 text-xs sm:px-4 sm:text-sm">
              Deposit
            </Link>
            <button
              type="button"
              className="btn-ghost px-3 py-2 lg:hidden"
              aria-expanded={open}
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? "Close" : "Menu"}
            </button>
            <button
              type="button"
              className="hidden text-sm font-medium text-brand-muted hover:text-brand-wine lg:inline"
              onClick={() => void logout()}
            >
              Log out
            </button>
          </div>
        </div>
        {open ? (
          <div className="border-t border-brand-sand/60 bg-brand-cream px-3 py-3 lg:hidden sm:px-4">
            <div className="mx-auto max-w-6xl space-y-3">
              <p className="text-sm font-semibold tabular-nums sm:hidden">
                {formatKes(cashCredits)} cash · {formatKes(promoCredits)} free
              </p>
              <nav className="grid grid-cols-2 gap-1.5">
                {allLinks.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`min-h-11 rounded-lg px-3 py-2.5 text-sm font-medium ${
                      isActive(path, l.href) ? "bg-brand-wine text-brand-paper" : "bg-white text-brand-wine"
                    }`}
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>
              <button
                type="button"
                className="min-h-11 w-full rounded-lg bg-white px-3 py-2.5 text-left text-sm font-medium text-brand-muted"
                onClick={() => void logout()}
              >
                Log out
              </button>
            </div>
          </div>
        ) : null}
      </header>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-brand-sand/70 bg-brand-cream/95 backdrop-blur-md lg:hidden"
        style={{ paddingBottom: "max(0.4rem, env(safe-area-inset-bottom))" }}
        aria-label="Primary"
      >
        <div className="mx-auto grid max-w-6xl grid-cols-4">
          {tabs.map((tab) => {
            const active = isActive(path, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex min-h-12 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] font-semibold ${
                  active ? "text-brand-wine" : "text-brand-muted"
                }`}
              >
                <TabIcon href={tab.href} />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
