"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { formatKes } from "@/components/ui/api";
import { SITE_NAME } from "@/domain/copy";

const links = [
  { href: "/play", label: "Play" },
  { href: "/wallet", label: "Wallet" },
  { href: "/withdraw", label: "Withdraw" },
  { href: "/fairness", label: "Fairness" },
  { href: "/responsible", label: "Responsible" },
  { href: "/account", label: "Account" },
];

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
  return (
    <header className="sticky top-0 z-20 border-b border-brand-sand bg-brand-paper/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <Link href="/play" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-wine text-sm font-bold text-brand-paper">
            C
          </span>
          <span className="text-base font-semibold text-brand-wine">{SITE_NAME}</span>
        </Link>
        <nav className="flex flex-wrap gap-1 text-sm text-mist-300">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-1.5 ${
                path === l.href || (l.href !== "/play" && path?.startsWith(l.href))
                  ? "bg-brand-sand/50 text-brand-wine"
                  : "hover:bg-brand-sand/40 hover:text-brand-wine"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {role === "ADMIN" ? (
            <Link
              href="/admin"
              className={`rounded-lg px-3 py-1.5 ${
                path?.startsWith("/admin") ? "bg-brand-sand/50 text-brand-wine" : "hover:bg-brand-sand/40"
              }`}
            >
              Admin
            </Link>
          ) : null}
        </nav>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold tabular-nums text-mist-100">{formatKes(cashCredits)}</p>
            <p className="text-[11px] text-mist-500">
              Cash · {formatKes(promoCredits)} free
              {displayName ? ` · ${displayName}` : ""}
            </p>
          </div>
          <Link href="/withdraw" className="btn-ghost py-2">
            Withdraw
          </Link>
          <Link href="/wallet#deposit" className="btn-primary py-2">
            Deposit
          </Link>
          <button
            className="text-sm text-brand-wine/70 hover:text-brand-wine"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              router.push("/login");
            }}
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
