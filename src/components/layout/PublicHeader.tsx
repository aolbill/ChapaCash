import Link from "next/link";
import { BrandMark } from "@/components/ui/chrome";

export function PublicHeader({ active }: { active?: "login" | "register" }) {
  return (
    <header className="border-b border-brand-sand/60 bg-brand-cream/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
        <BrandMark />
        <div className="flex shrink-0 items-center gap-2">
          {active !== "login" ? (
            <Link href="/login" className={active === "register" ? "btn-primary px-3 py-2 text-sm sm:px-4" : "btn-ghost px-3 py-2 text-sm sm:px-4"}>
              Log in
            </Link>
          ) : null}
          {active !== "register" ? (
            <Link href="/register" className="btn-primary px-3 py-2 text-sm sm:px-4">
              <span className="sm:hidden">Join</span>
              <span className="hidden sm:inline">Create account</span>
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
