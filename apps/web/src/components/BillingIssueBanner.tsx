import { useEffect, useState } from 'react';
import { manageSubscription } from '../state/access';
import { useSession } from '../state/api';
import { track } from '../state/events';
import '../pages/manage.css';

/**
 * One calm line when a renewal payment failed. Pro stays on while Stripe
 * retries, so the words say that, and the one button opens the billing
 * portal to fix the card. No countdown and no alarm.
 */
export function BillingIssueBanner({ where = 'today' }: { where?: string }) {
  const session = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const shown = !!session?.user.access.billingIssue;
  useEffect(() => {
    if (shown) track('billing_banner_shown', { where });
  }, [shown, where]);
  if (!shown) return null;
  return (
    <div className="billing-banner reveal" role="status">
      <span className="grow">{error ?? "Your payment didn't go through."}</span>
      <button
        className="btn btn-tinted"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          track('billing_banner_tapped', { where });
          setError(await manageSubscription());
          setBusy(false);
        }}
      >
        Update payment
      </button>
    </div>
  );
}
