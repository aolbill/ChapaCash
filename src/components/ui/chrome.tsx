"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SITE_NAME } from "@/domain/copy";

export function BrandMark({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="flex min-w-0 items-center gap-2 sm:gap-2.5">
      <span className="h-[30px] w-[30px] shrink-0 rounded-lg bg-[radial-gradient(circle_at_35%_30%,#ff5b66,#e11d2a)] shadow-[0_0_16px_rgba(225,29,42,.5)]" />
      {compact ? (
        <span className="sr-only">{SITE_NAME}</span>
      ) : (
        <span className="truncate text-[15px] font-extrabold tracking-wide text-brand-ink sm:text-[17px]">
          CHAPA
          <span className="ml-1 inline-block rounded-md bg-brand-wine px-1.5 py-0.5 text-white">CASH</span>
        </span>
      )}
    </Link>
  );
}

export function PageHeader({
  kicker,
  title,
  description,
  actions,
}: {
  kicker?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-brand-sand pb-5 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="min-w-0">
        {kicker ? <p className="kicker">{kicker}</p> : null}
        <h1 className="page-title">{title}</h1>
        {description ? <div className="page-lead">{description}</div> : null}
      </div>
      {actions ? <div className="flex w-full flex-wrap gap-2 sm:w-auto">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-brand-sand bg-brand-surface/70 px-4 py-8 text-center text-sm text-brand-muted">
      {children}
    </p>
  );
}

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "live" | "ok" | "warn" | "danger";
}) {
  const cls =
    tone === "live"
      ? "bg-brand-wine text-white"
      : tone === "ok"
        ? "bg-brand-success/15 text-brand-success"
        : tone === "warn"
          ? "bg-brand-warning/15 text-brand-warning"
          : tone === "danger"
            ? "bg-brand-danger/15 text-brand-danger"
            : "bg-brand-surface text-brand-ink";
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>{children}</span>;
}

export function AdminNav() {
  const path = usePathname();
  const items = [
    { href: "/admin", label: "Overview", exact: true },
    { href: "/admin/series", label: "Series", exact: false },
    { href: "/admin/users", label: "Users", exact: false },
    { href: "/admin/audit", label: "Audit", exact: false },
  ];
  return (
    <nav className="flex w-full flex-wrap gap-1 rounded-xl bg-brand-surface p-1 sm:w-auto">
      {items.map((item) => {
        const active = item.exact ? path === item.href : Boolean(path?.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              active ? "bg-brand-wine text-white" : "text-brand-ink hover:bg-brand-cream"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
