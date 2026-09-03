import { PageHeader } from "@/components/ui/chrome";
import { SITE_BANNER } from "@/domain/copy";

export default function ResponsiblePage() {
  return (
      <article className="mx-auto max-w-2xl space-y-6">
        <PageHeader kicker="Play safe" title="Responsible play" />
        <div className="card space-y-4 p-6 text-sm leading-relaxed">
          <p className="font-medium text-brand-wine">{SITE_BANNER}</p>
          <p className="text-brand-wineDark">
            Deposits are real Kenyan shillings via Paystack M-PESA. You can lose money. Only use funds you
            can afford to lose. Session, loss, and self-exclusion limits are not fully enforced yet.
          </p>
          <p className="text-brand-muted">
            This product is not a substitute for a gambling licence, KYC/AML programme, or legal advice.
            You are responsible for operating only where you are allowed to.
          </p>
        </div>
      </article>
  );
}
