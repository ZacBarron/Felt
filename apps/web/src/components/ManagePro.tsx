import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { haptic } from '../haptics';
import {
  ASK_DETAIL,
  CANCEL_REASON_LABELS,
  CANCEL_REASONS,
  type CancelOutcome,
  type CancelReason,
  cancelPro,
  fetchSubscription,
  manageRoute,
  manageSubscription,
  manageSummary,
  offerCopy,
  outcomeCopy,
  reasonNote,
  resumePro,
  type Subscription,
} from '../state/access';
import { BottomBar } from '../ui/BottomBar';
import { Chips } from '../ui/Chips';
import { CheckIcon } from '../ui/icons';
import { PageHeader } from '../ui/PageHeader';
import { ProBadge } from '../ui/ProBadge';
import { Section } from '../ui/Section';
import { Segmented } from '../ui/Segmented';
import '../pages/manage.css';

export type ManageStep = 'overview' | 'cancel' | 'done';

const ACCOUNT = '/account';
const stepPath = (step: ManageStep) => `${ACCOUNT}?manage=${step === 'overview' ? '1' : step}`;

/**
 * Manage Pro, reached from Account at /account?manage=1. It shows the plan
 * and its renewal date. Cancel goes to one screen: the reason first, then the
 * one offer for that reason (or none), with Cancel Pro always there at the
 * same size. The last screen states the end date and that the free plan and
 * all progress stay.
 */
export function ManagePro({ step }: { step: ManageStep }) {
  const navigate = useNavigate();
  const [sub, setSub] = useState<Subscription | null>();
  const [error, setError] = useState<string>();
  const [outcome, setOutcome] = useState<{ kind: CancelOutcome; sub: Subscription; wasTrial: boolean }>();

  const load = () => {
    setError(undefined);
    fetchSubscription()
      .then(setSub)
      .catch((e: unknown) => {
        setSub(null);
        setError(e instanceof Error ? e.message : 'Aced could not load your plan. Try again.');
      });
  };
  useEffect(load, []);

  // The confirmation needs the answer from the cancel request; after a reload it is gone, so show the plan.
  const shown: ManageStep = step === 'done' && !outcome ? 'overview' : step;

  if (sub === undefined) return <PageHeader title="Manage Pro" back={{ to: ACCOUNT, label: 'Account' }} />;
  if (sub === null)
    return (
      <>
        <PageHeader title="Manage Pro" back={{ to: ACCOUNT, label: 'Account' }} />
        <p className="mp-status" role="status">
          {error}
        </p>
        <BottomBar>
          <button className="btn btn-lg btn-block btn-tinted" onClick={load}>
            Try again
          </button>
        </BottomBar>
      </>
    );

  if (shown === 'cancel')
    return (
      <CancelStep
        sub={sub}
        onBack={() => navigate(stepPath('overview'))}
        onDone={(kind, next) => {
          setOutcome({ kind, sub: next, wasTrial: sub.status === 'trialing' });
          setSub(next);
          navigate(stepPath('done'), { replace: true });
        }}
      />
    );
  if (shown === 'done' && outcome) return <DoneStep outcome={outcome} onResumed={setSub} />;
  return <Overview sub={sub} onChange={setSub} onCancel={() => navigate(stepPath('cancel'))} />;
}

function Overview({ sub, onChange, onCancel }: { sub: Subscription; onChange: (s: Subscription) => void; onCancel: () => void }) {
  const summary = manageSummary(sub);
  const route = manageRoute(sub.store);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const run = async (fn: () => Promise<string | undefined>) => {
    setBusy(true);
    setMessage(undefined);
    const err = await fn();
    if (err) {
      haptic('error');
      setMessage(err);
    }
    setBusy(false);
  };
  const paid = sub.status !== 'none' && sub.status !== 'canceled' && sub.status !== 'lifetime';

  return (
    <div className="stack" style={{ gap: '1.6rem' }}>
      <PageHeader title="Manage Pro" back={{ to: ACCOUNT, label: 'Account' }} />
      <section className="card mp-plan reveal" aria-label="Your plan">
        {sub.status !== 'none' && sub.status !== 'canceled' && (
          <span>
            <ProBadge>{sub.status === 'lifetime' ? 'Founding' : 'Pro'}</ProBadge>
          </span>
        )}
        <h2 className="mp-plan-name">{summary.title}</h2>
        <p className="mp-plan-line">{summary.line}</p>
      </section>

      {paid && route.kind === 'in-app' && (
        <Section footer={message ? <span role="status">{message}</span> : undefined}>
          <div className="list">
            <button className="list-row" disabled={busy} onClick={() => void run(manageSubscription)}>
              <span className="grow" style={{ color: 'var(--tint)' }}>
                Update payment
              </span>
            </button>
          </div>
        </Section>
      )}

      {(summary.resume || summary.canCancel || !paid) && sub.status !== 'lifetime' && (
        <BottomBar>
          {summary.resume && (
            <button
              className="btn btn-primary btn-lg btn-block"
              disabled={busy}
              data-haptic="off"
              onClick={() =>
                void run(async () => {
                  try {
                    const res = await resumePro();
                    haptic('success');
                    onChange(res.subscription);
                    return undefined;
                  } catch (e) {
                    return e instanceof Error ? e.message : 'Aced could not change your plan. Try again.';
                  }
                })
              }
            >
              {summary.resume}
            </button>
          )}
          {summary.canCancel &&
            (route.kind === 'store' ? (
              // App Store and Play subscriptions are cancelled in the store.
              <a className="btn btn-lg btn-block" href={route.url}>
                {route.label}
              </a>
            ) : (
              <button className="btn btn-lg btn-block" onClick={onCancel}>
                Cancel Pro
              </button>
            ))}
          {!paid && (
            <Link to="/pro?from=account" className="btn btn-primary btn-lg btn-block">
              See Aced Pro
            </Link>
          )}
        </BottomBar>
      )}
    </div>
  );
}

function CancelStep({ sub, onBack, onDone }: { sub: Subscription; onBack: () => void; onDone: (kind: CancelOutcome, sub: Subscription) => void }) {
  const [reason, setReason] = useState<CancelReason | ''>('');
  const [detail, setDetail] = useState('');
  const [months, setMonths] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const offer = reason ? sub.offers[reason] : null;
  const copy = offer ? offerCopy(offer, months) : undefined;

  const send = async (acceptOffer: boolean) => {
    setBusy(true);
    setMessage(undefined);
    try {
      const res = await cancelPro({
        ...(reason ? { reason } : {}),
        ...(detail.trim() ? { detail: detail.trim() } : {}),
        ...(acceptOffer ? { acceptOffer: true, pauseMonths: months } : {}),
      });
      haptic(acceptOffer ? 'success' : 'warning');
      onDone(res.outcome, res.subscription);
    } catch (e) {
      haptic('error');
      setMessage(e instanceof Error ? e.message : 'Aced could not change your plan. Try again.');
      setBusy(false);
    }
  };

  return (
    <div className="stack" style={{ gap: '1.6rem' }}>
      <PageHeader title="Cancel Aced Pro" back={{ to: stepPath('overview'), label: 'Manage Pro' }} />

      <Section title="What's the main reason?" info={<p>Pick one if you like. You can cancel without it. It helps us make Aced better.</p>}>
        <div className="mp-reasons">
          <Chips<CancelReason | ''>
            ariaLabel="Reason for cancelling"
            value={reason}
            onChange={setReason}
            options={CANCEL_REASONS.map((r) => ({ value: r, label: CANCEL_REASON_LABELS[r] }))}
          />
        </div>
      </Section>

      {offer && copy ? (
        <section className="card mp-offer reveal" aria-live="polite">
          <h2>{copy.title}</h2>
          {copy.body.map((line) => (
            <p key={line}>{line}</p>
          ))}
          {offer.kind === 'pause' && (
            <Segmented<number>
              ariaLabel="Pause length"
              stretch
              value={months}
              onChange={setMonths}
              options={offer.months.map((m) => ({ value: m, label: m === 1 ? '1 month' : `${m} months` }))}
            />
          )}
        </section>
      ) : (
        reason && (
          <p className="mp-note reveal" aria-live="polite">
            {reasonNote(reason)}
          </p>
        )
      )}

      {reason && ASK_DETAIL.has(reason) && (
        <div className="mp-detail">
          <label htmlFor="cancel-detail">Tell us more (optional)</label>
          <textarea id="cancel-detail" maxLength={1000} value={detail} onChange={(e) => setDetail(e.target.value)} />
        </div>
      )}

      <BottomBar>
        {message && (
          <p className="mp-status" role="status">
            {message}
          </p>
        )}
        {copy && (
          <button className="btn btn-tinted btn-lg btn-block" disabled={busy} data-haptic="off" onClick={() => void send(true)}>
            {copy.action}
          </button>
        )}
        <button className="btn btn-lg btn-block" disabled={busy} data-haptic="off" onClick={() => void send(false)}>
          Cancel Pro
        </button>
        {!copy && (
          <button className="btn btn-lg btn-block btn-tinted" disabled={busy} onClick={onBack}>
            Keep Aced Pro
          </button>
        )}
      </BottomBar>
    </div>
  );
}

function DoneStep({ outcome, onResumed }: { outcome: { kind: CancelOutcome; sub: Subscription; wasTrial: boolean }; onResumed: (s: Subscription) => void }) {
  const navigate = useNavigate();
  const copy = outcomeCopy(outcome.kind, outcome.sub, outcome.wasTrial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  return (
    <div className="stack" style={{ gap: '1.6rem' }}>
      <PageHeader title="Manage Pro" back={{ to: ACCOUNT, label: 'Account' }} />
      <div className="mp-done reveal" role="status">
        <span className="mp-done-icon" aria-hidden="true">
          <CheckIcon size={30} />
        </span>
        <h2>{copy.title}</h2>
        {copy.body.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <BottomBar>
        {message && (
          <p className="mp-status" role="status">
            {message}
          </p>
        )}
        <button className="btn btn-primary btn-lg btn-block" onClick={() => navigate(ACCOUNT)}>
          Done
        </button>
        {outcome.kind === 'canceled' && (
          <button
            className="btn btn-lg btn-block"
            disabled={busy}
            data-haptic="off"
            onClick={async () => {
              setBusy(true);
              try {
                const res = await resumePro();
                haptic('success');
                onResumed(res.subscription);
                navigate(stepPath('overview'), { replace: true });
              } catch (e) {
                haptic('error');
                setMessage(e instanceof Error ? e.message : 'Aced could not change your plan. Try again.');
                setBusy(false);
              }
            }}
          >
            Keep Aced Pro
          </button>
        )}
      </BottomBar>
    </div>
  );
}
