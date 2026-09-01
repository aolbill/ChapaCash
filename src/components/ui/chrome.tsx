"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SITE_NAME } from "@/domain/copy";

export function BrandMark({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-wine text-[11px] font-bold tracking-tight text-brand-paper shadow-sm">
        CC
      </span>
      {compact ? (
        <span className="sr-only">{SITE_NAME}</span>
      ) : (
        <span className="text-lg font-semibold tracking-tight text-brand-wine">{SITE_NAME}</span>
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
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {kicker ? <p className="kicker">{kicker}</p> : null}
        <h1 className="page-title">{title}</h1>
        {description ? <div className="page-lead">{description}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-brand-sand bg-white/70 px-4 py-8 text-center text-sm text-brand-muted">
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
      ? "bg-brand-wine text-brand-paper"
      : tone === "ok"
        ? "bg-brand-success/10 text-brand-success"
        : tone === "warn"
          ? "bg-brand-warning/15 text-brand-warning"
          : tone === "danger"
            ? "bg-brand-danger/10 text-brand-danger"
            : "bg-brand-sand/40 text-brand-wine";
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>{children}</span>;
}

export function AdminNav() {
  const path = usePathname();
  const items = [
    { href: "/admin", label: "Overview", exact: true },
    { href: "/admin/users", label: "Users", exact: false },
    { href: "/admin/audit", label: "Audit", exact: false },
  ];
  return (
    <nav className="flex flex-wrap gap-1 rounded-xl bg-brand-sand/30 p-1">
      {items.map((item) => {
        const active = item.exact ? path === item.href : Boolean(path?.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              active ? "bg-brand-wine text-brand-paper" : "text-brand-wine hover:bg-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
