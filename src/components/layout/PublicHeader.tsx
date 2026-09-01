import Link from "next/link";
import { BrandMark } from "@/components/ui/chrome";

export function PublicHeader({ active }: { active?: "login" | "register" }) {
  return (
    <header className="border-b border-brand-sand/60 bg-brand-cream/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <BrandMark />
        <div className="flex items-center gap-2">
          {active !== "login" ? (
            <Link href="/login" className={active === "register" ? "btn-primary py-2" : "btn-ghost py-2"}>
              Log in
            </Link>
          ) : null}
          {active !== "register" ? (
            <Link href="/register" className="btn-primary py-2">
              Create account
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
