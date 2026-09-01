import Link from "next/link";
import { SITE_BANNER, SITE_NAME } from "@/domain/copy";
import { PublicHeader } from "@/components/layout/PublicHeader";

export default function HomePage() {
  return (
    <>
      <PublicHeader />
      <main className="mx-auto grid max-w-6xl gap-12 px-4 py-12 lg:grid-cols-2 lg:items-center lg:py-20">
        <div>
          <p className="kicker">{SITE_NAME}</p>
          <h1 className="mt-3 text-4xl font-semibold leading-[1.1] tracking-tight text-brand-wine sm:text-5xl">
            Crash rounds.
            <br />
            Real M-PESA cash.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-brand-muted">
            Sign up with your Safaricom number. Practice on free credits, then deposit to stake Kenyan
            shillings. Outcomes are decided on the server — never in the browser.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="btn-primary px-6 py-3">
              Create account
            </Link>
            <Link href="/login" className="btn-ghost px-6 py-3">
              Log in
            </Link>
          </div>
          <p className="mt-6 max-w-lg text-xs leading-relaxed text-brand-muted">{SITE_BANNER}</p>
        </div>
        <div className="card space-y-5 p-6 sm:p-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-brand-paper to-white px-4 py-10 text-center ring-1 ring-brand-sand/40">
            <svg className="pointer-events-none absolute inset-x-4 bottom-8 h-16 w-[calc(100%-2rem)] text-brand-wine/25" viewBox="0 0 320 64" fill="none" aria-hidden>
              <path d="M4 56 C 80 56, 140 48, 190 28 C 230 12, 260 6, 316 4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <p className="kicker relative">Live multiplier</p>
            <p className="relative mt-3 font-mono text-6xl font-semibold tabular-nums text-brand-wine">2.47x</p>
            <p className="relative mt-3 text-sm text-brand-muted">Cash out before the crash</p>
          </div>
          <ul className="space-y-3 text-sm leading-relaxed text-brand-wineDark">
            <li className="flex gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-wine" />
              Cash wallet shows only what you deposited via STK.
            </li>
            <li className="flex gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-wine" />
              Free credits until you fund — with a higher chance to survive the crash.
            </li>
            <li className="flex gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-wine" />
              07 and 011 Safaricom numbers supported.
            </li>
          </ul>
        </div>
      </main>
    </>
  );
}
