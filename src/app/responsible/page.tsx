import { AppShell } from "@/components/layout/AppShell";
import { SITE_BANNER } from "@/domain/copy";

export default function ResponsiblePage() {
  return (
    <AppShell>
      <article className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold">Responsible play</h1>
        <p className="text-brand-wine">{SITE_BANNER}</p>
        <p className="text-mist-300">
          Deposits are real Kenyan shillings via Paystack M-PESA. You can lose money. Only use funds you
          can afford to lose. Session, loss, and self-exclusion limits are not fully enforced yet.
        </p>
        <p className="text-sm text-mist-500">
          This product is not a substitute for a gambling licence, KYC/AML programme, or legal advice.
          You are responsible for operating only where you are allowed to.
        </p>
      </article>
    </AppShell>
  );
}
