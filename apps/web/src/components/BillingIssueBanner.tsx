import { useState } from 'react';
import { manageSubscription } from '../state/access';
import { useSession } from '../state/api';
import '../pages/manage.css';

/**
 * One calm line when a renewal payment failed. Pro stays on while Stripe
 * retries, so the words say that, and the one button opens the billing
 * portal to fix the card. No countdown and no alarm.
 */
export function BillingIssueBanner() {
  const session = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  if (!session?.user.access.billingIssue) return null;
  return (
    <div className="billing-banner reveal" role="status">
      <span className="grow">{error ?? "Your payment didn't go through."}</span>
      <button
        className="btn btn-tinted"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(await manageSubscription());
          setBusy(false);
        }}
      >
        Update payment
      </button>
    </div>
  );
}
