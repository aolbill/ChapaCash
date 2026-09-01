import Link from "next/link";
import { SITE_BANNER, SITE_NAME } from "@/domain/copy";

export default function HomePage() {
  return (
    <main className="mx-auto grid max-w-5xl gap-12 px-6 py-16 lg:grid-cols-2 lg:items-center">
      <div>
        <p className="text-sm font-semibold tracking-wide text-brand-wine">{SITE_NAME}</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight text-brand-wine sm:text-5xl">
          Crash rounds.
          <br />
          Real M-PESA cash.
        </h1>
        <p className="mt-4 max-w-xl text-brand-wine/80">
          Sign up with your Safaricom number. Practice on free credits, then deposit to stake Kenyan
          shillings. Outcomes are decided on the server — never in the browser.
        </p>
        <p className="mt-4 text-sm text-brand-wine">{SITE_BANNER}</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/register" className="btn-primary px-5 py-3">
            Create account
          </Link>
          <Link href="/login" className="btn-ghost px-5 py-3">
            Log in
          </Link>
        </div>
      </div>
      <div className="card space-y-4 p-6">
        <div className="rounded-xl bg-brand-paper px-4 py-8 text-center">
          <p className="font-mono text-5xl font-semibold text-brand-wine">2.47x</p>
          <p className="mt-2 text-sm text-brand-sand">Live multiplier</p>
        </div>
        <ul className="space-y-3 text-sm text-brand-wine/80">
          <li>Cash wallet shows only what you deposited via STK.</li>
          <li>Free credits until you fund — with a higher chance to survive the crash.</li>
          <li>07 and 011 Safaricom numbers supported.</li>
        </ul>
      </div>
    </main>
  );
}
